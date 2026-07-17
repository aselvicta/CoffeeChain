from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from supply_chain.models import AuditLog, Branch, Supplier

from .models import AdminRecommendation, ComplianceFlag, FlagResponse, OrganisationCertificate
from .permissions import is_admin, is_regulator
from .serializers import (
    AdminRecommendationSerializer,
    ComplianceFlagDetailSerializer,
    ComplianceFlagListSerializer,
    ComplianceFlagStatusUpdateSerializer,
    ComplianceFlagWriteSerializer,
    FlagResponseSerializer,
    OrganisationCertificateReviewSerializer,
    OrganisationCertificateSerializer,
    OrganisationCertificateUploadSerializer,
    RecommendationCreateSerializer,
    RecommendationDecisionSerializer,
)
from .services import (
    apply_suspend_action_for_flag,
    can_user_access_flag,
    certificates_due_for_renewal,
    compute_compliance_snapshot,
    get_user_organisation,
    notify_admin_decision,
    notify_certificate_reviewed,
    notify_certificate_uploaded,
    notify_flag_created,
    notify_flag_response,
    notify_recommendation_submitted,
    set_flag_status,
    sync_flag_status_with_recommendation,
)


class ComplianceFlagViewSet(viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]
    queryset = ComplianceFlag.objects.select_related(
        "raised_by",
        "flagged_supplier",
        "flagged_branch",
        "recommendation",
    ).prefetch_related("responses")

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        if is_admin(user) or is_regulator(user):
            pass
        else:
            supplier = Supplier.objects.filter(user=user).first()
            if supplier:
                qs = qs.filter(flagged_supplier=supplier)
            else:
                branch = Branch.objects.filter(user=user).first()
                if branch:
                    qs = qs.filter(flagged_branch=branch)
                else:
                    manager = user.warehouse_manager_profile if hasattr(user, "warehouse_manager_profile") else None
                    if manager and manager.supplier_id:
                        qs = qs.filter(flagged_supplier_id=manager.supplier_id)
                    else:
                        return qs.none()

        # Heal escalated flags that admin already decided.
        ComplianceFlag.objects.filter(
            pk__in=qs.filter(recommendation__admin_decision__in=["actioned", "dismissed"])
            .exclude(status=ComplianceFlag.Status.RESOLVED)
            .values_list("pk", flat=True)
        ).update(status=ComplianceFlag.Status.RESOLVED, updated_at=timezone.now())

        return qs

    def get_object(self):
        flag = super().get_object()
        return sync_flag_status_with_recommendation(flag)

    def get_serializer_class(self):
        if self.action == "list":
            return ComplianceFlagListSerializer
        if self.action == "retrieve":
            return ComplianceFlagDetailSerializer
        if self.action == "create":
            return ComplianceFlagWriteSerializer
        if self.action == "partial_update":
            return ComplianceFlagStatusUpdateSerializer
        if self.action == "respond":
            return FlagResponseSerializer
        if self.action == "recommend":
            return RecommendationCreateSerializer
        return ComplianceFlagDetailSerializer

    def create(self, request, *args, **kwargs):
        if not is_regulator(request.user):
            return Response({"detail": "Only regulators can raise flags."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        flag = serializer.save(raised_by=request.user)

        AuditLog.objects.create(
            action="compliance_flag_created",
            user=request.user,
            details={"flag_id": flag.id, "target_type": flag.target_type, "target_id": flag.target_id},
        )
        try:
            notify_flag_created(flag)
        except Exception:
            # Never block flag creation on notification delivery issues.
            pass

        return Response(ComplianceFlagDetailSerializer(flag).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not is_regulator(request.user):
            return Response({"detail": "Only regulators can update flag status."}, status=status.HTTP_403_FORBIDDEN)

        flag = self.get_object()
        serializer = self.get_serializer(flag, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        next_status = serializer.validated_data.get("status")
        allowed_transitions = {
            ComplianceFlag.Status.OPEN: {ComplianceFlag.Status.UNDER_REVIEW},
            ComplianceFlag.Status.UNDER_REVIEW: {ComplianceFlag.Status.OPEN},
        }
        if next_status and next_status != flag.status:
            allowed = allowed_transitions.get(flag.status, set())
            if next_status not in allowed:
                return Response(
                    {
                        "detail": (
                            f"Cannot change status from '{flag.status}' to '{next_status}'. "
                            "Use Recommend Action to escalate, or wait for admin decision to resolve."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            set_flag_status(flag, next_status)
        AuditLog.objects.create(
            action="compliance_flag_status_updated",
            user=request.user,
            details={"flag_id": flag.id, "status": flag.status},
        )
        return Response(ComplianceFlagDetailSerializer(flag).data)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        flag = self.get_object()
        if is_admin(request.user) or is_regulator(request.user):
            return Response(
                {"detail": "Only flagged organisations can respond to a flag."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not can_user_access_flag(request.user, flag):
            return Response({"detail": "You can only respond to your own organisation flags."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response_obj = FlagResponse.objects.create(
            flag=flag,
            responded_by=request.user,
            message=serializer.validated_data["message"],
        )
        notify_flag_response(response_obj)
        AuditLog.objects.create(
            action="compliance_flag_responded",
            user=request.user,
            details={"flag_id": flag.id, "response_id": response_obj.id},
        )
        return Response(FlagResponseSerializer(response_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def recommend(self, request, pk=None):
        if not is_regulator(request.user):
            return Response({"detail": "Only regulators can submit recommendations."}, status=status.HTTP_403_FORBIDDEN)

        flag = self.get_object()
        if hasattr(flag, "recommendation"):
            return Response({"detail": "Recommendation already exists for this flag."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recommendation = AdminRecommendation.objects.create(
            flag=flag,
            recommended_by=request.user,
            recommended_action=serializer.validated_data["recommended_action"],
            justification=serializer.validated_data["justification"],
        )

        if recommendation.recommended_action != AdminRecommendation.RecommendedAction.NO_ACTION:
            set_flag_status(flag, ComplianceFlag.Status.ESCALATED)
        elif flag.status == ComplianceFlag.Status.OPEN:
            set_flag_status(flag, ComplianceFlag.Status.UNDER_REVIEW)

        flag.refresh_from_db()
        notify_recommendation_submitted(recommendation)
        AuditLog.objects.create(
            action="compliance_recommendation_created",
            user=request.user,
            details={
                "flag_id": flag.id,
                "recommendation_id": recommendation.id,
                "flag_status": flag.status,
            },
        )
        payload = AdminRecommendationSerializer(recommendation).data
        payload["flag_status"] = flag.status
        return Response(payload, status=status.HTTP_201_CREATED)


class AdminRecommendationViewSet(viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin):
    permission_classes = [IsAuthenticated]
    queryset = AdminRecommendation.objects.select_related(
        "flag",
        "flag__flagged_supplier",
        "flag__flagged_branch",
        "recommended_by",
        "decided_by",
    )
    serializer_class = AdminRecommendationSerializer

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        if is_admin(user) or is_regulator(user):
            pass
        else:
            return qs.none()

        decision = (self.request.query_params.get("decision") or "").strip().lower()
        if decision:
            qs = qs.filter(admin_decision=decision)

        return qs

    @action(detail=True, methods=["patch"])
    def decide(self, request, pk=None):
        if not is_admin(request.user):
            return Response({"detail": "Only admins can make final decisions."}, status=status.HTTP_403_FORBIDDEN)

        recommendation = self.get_object()
        if recommendation.admin_decision != AdminRecommendation.AdminDecision.PENDING:
            return Response(
                {"detail": "Decision is immutable once saved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RecommendationDecisionSerializer(recommendation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            recommendation.admin_decision = serializer.validated_data["admin_decision"]
            recommendation.admin_decision_note = serializer.validated_data.get("admin_decision_note", "")
            recommendation.decided_by = request.user
            recommendation.decided_at = timezone.now()
            recommendation.save(
                update_fields=[
                    "admin_decision",
                    "admin_decision_note",
                    "decided_by",
                    "decided_at",
                ]
            )

            flag = recommendation.flag
            if recommendation.admin_decision in (
                AdminRecommendation.AdminDecision.ACTIONED,
                AdminRecommendation.AdminDecision.DISMISSED,
            ):
                set_flag_status(flag, ComplianceFlag.Status.RESOLVED)
                if (
                    recommendation.admin_decision == AdminRecommendation.AdminDecision.ACTIONED
                    and recommendation.recommended_action == AdminRecommendation.RecommendedAction.SUSPEND
                ):
                    apply_suspend_action_for_flag(flag, decided_by=request.user)

            flag.refresh_from_db()
            recommendation.refresh_from_db()

            AuditLog.objects.create(
                action="compliance_recommendation_decided",
                user=request.user,
                details={
                    "recommendation_id": recommendation.id,
                    "flag_id": flag.id,
                    "decision": recommendation.admin_decision,
                    "recommended_action": recommendation.recommended_action,
                    "flag_status": flag.status,
                },
            )

        notify_admin_decision(recommendation)
        # Ensure nested flag_summary reflects resolved status.
        recommendation.flag.refresh_from_db()
        payload = AdminRecommendationSerializer(recommendation).data
        payload["flag_status"] = recommendation.flag.status
        return Response(payload)


class OrganisationComplianceStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_type = (request.query_params.get("type") or "").strip().lower()
        org_id = request.query_params.get("id")

        if org_type not in {"supplier", "branch"}:
            return Response({"detail": "type must be 'supplier' or 'branch'."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            org_id = int(org_id)
        except (TypeError, ValueError):
            return Response({"detail": "id must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if org_type == "supplier":
            supplier = Supplier.objects.filter(pk=org_id).first()
            if not supplier:
                return Response({"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND)
            payload = compute_compliance_snapshot(supplier=supplier)
            payload.update({"type": "supplier", "id": supplier.id, "name": supplier.name})
            return Response(payload)

        branch = Branch.objects.filter(pk=org_id).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        payload = compute_compliance_snapshot(branch=branch)
        payload.update({"type": "branch", "id": branch.id, "name": branch.name})
        return Response(payload)


class OrganisationCertificateViewSet(viewsets.GenericViewSet, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = OrganisationCertificate.objects.select_related(
        "supplier",
        "branch",
        "uploaded_by",
        "reviewed_by",
    )

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        status_filter = (self.request.query_params.get("status") or "").strip().lower()
        due_soon = (self.request.query_params.get("due_soon") or "").strip().lower() in {"1", "true", "yes"}

        if is_admin(user) or is_regulator(user):
            if due_soon:
                return certificates_due_for_renewal()
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs

        org_type, org_id, _ = get_user_organisation(user)
        if org_type == "supplier":
            qs = qs.filter(supplier_id=org_id)
        elif org_type == "branch":
            qs = qs.filter(branch_id=org_id)
        else:
            return qs.none()

        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return OrganisationCertificateUploadSerializer
        if self.action == "review":
            return OrganisationCertificateReviewSerializer
        return OrganisationCertificateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        if is_admin(request.user) or is_regulator(request.user):
            return Response(
                {"detail": "Regulators and admins review certificates; organisations upload them."},
                status=status.HTTP_403_FORBIDDEN,
            )

        org_type, org_id, _ = get_user_organisation(request.user)
        if org_type not in {"supplier", "branch"}:
            return Response(
                {"detail": "Only suppliers, retailers, cooperatives, or warehouse managers can upload certificates."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        extras = {
            "uploaded_by": request.user,
            "status": OrganisationCertificate.Status.PENDING_REVIEW,
            "is_active": False,
            "supplier": None,
            "branch": None,
        }
        if org_type == "supplier":
            extras["supplier"] = Supplier.objects.get(pk=org_id)
        else:
            extras["branch"] = Branch.objects.get(pk=org_id)

        cert = OrganisationCertificate.objects.create(**serializer.validated_data, **extras)
        AuditLog.objects.create(
            action="organisation_certificate_uploaded",
            user=request.user,
            details={"certificate_id": cert.id, "document_type": cert.document_type},
        )
        notify_certificate_uploaded(cert)
        return Response(
            OrganisationCertificateSerializer(cert, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        if not is_regulator(request.user):
            return Response({"detail": "Only regulators can verify certificates."}, status=status.HTTP_403_FORBIDDEN)

        cert = self.get_object()
        if cert.status not in {
            OrganisationCertificate.Status.PENDING_REVIEW,
            OrganisationCertificate.Status.EXPIRED,
        }:
            return Response(
                {"detail": "Only pending or expired certificates can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data["decision"]
        review_note = (serializer.validated_data.get("review_note") or "").strip()
        expires_on = serializer.validated_data.get("expires_on")

        with transaction.atomic():
            if decision == "verified":
                # Deactivate other active verified certs for the same org
                siblings = OrganisationCertificate.objects.filter(
                    status=OrganisationCertificate.Status.VERIFIED,
                    is_active=True,
                )
                if cert.supplier_id:
                    siblings = siblings.filter(supplier_id=cert.supplier_id)
                else:
                    siblings = siblings.filter(branch_id=cert.branch_id)
                siblings.exclude(pk=cert.pk).update(is_active=False)

                if expires_on:
                    cert.expires_on = expires_on
                cert.status = OrganisationCertificate.Status.VERIFIED
                cert.is_active = True
            else:
                cert.status = OrganisationCertificate.Status.REJECTED
                cert.is_active = False

            cert.review_note = review_note
            cert.reviewed_by = request.user
            cert.reviewed_at = timezone.now()
            cert.save()

            AuditLog.objects.create(
                action="organisation_certificate_reviewed",
                user=request.user,
                details={
                    "certificate_id": cert.id,
                    "decision": decision,
                    "status": cert.status,
                },
            )

        notify_certificate_reviewed(cert)
        return Response(OrganisationCertificateSerializer(cert, context=self.get_serializer_context()).data)
