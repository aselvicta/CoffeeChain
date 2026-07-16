from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AdminRecommendation, ComplianceFlag, FlagResponse, OrganisationCertificate
from .services import resolve_target_summary, serialize_flagged_organisation


User = get_user_model()


class FlagResponseSerializer(serializers.ModelSerializer):
    responded_by_username = serializers.CharField(source="responded_by.username", read_only=True)

    class Meta:
        model = FlagResponse
        fields = ["id", "message", "responded_by", "responded_by_username", "created_at"]
        read_only_fields = ["id", "responded_by", "responded_by_username", "created_at"]


class AdminRecommendationSerializer(serializers.ModelSerializer):
    recommended_by_username = serializers.CharField(source="recommended_by.username", read_only=True)
    decided_by_username = serializers.CharField(source="decided_by.username", read_only=True)
    flag_summary = serializers.SerializerMethodField()

    class Meta:
        model = AdminRecommendation
        fields = [
            "id",
            "flag",
            "flag_summary",
            "recommended_by",
            "recommended_by_username",
            "recommended_action",
            "justification",
            "admin_decision",
            "admin_decision_note",
            "decided_by",
            "decided_by_username",
            "decided_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "flag",
            "flag_summary",
            "recommended_by",
            "recommended_by_username",
            "admin_decision",
            "admin_decision_note",
            "decided_by",
            "decided_by_username",
            "decided_at",
            "created_at",
        ]

    def get_flag_summary(self, obj):
        flag = obj.flag
        return {
            "id": flag.id,
            "target_type": flag.target_type,
            "target_id": flag.target_id,
            "target_summary": resolve_target_summary(flag.target_type, flag.target_id),
            "reason": flag.reason,
            "description": flag.description,
            "evidence_ref": flag.evidence_ref,
            "status": flag.status,
            "flagged_organisation": serialize_flagged_organisation(flag),
        }


class ComplianceFlagListSerializer(serializers.ModelSerializer):
    raised_by_username = serializers.CharField(source="raised_by.username", read_only=True)
    target_summary = serializers.SerializerMethodField()
    flagged_organisation = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceFlag
        fields = [
            "id",
            "target_type",
            "target_id",
            "target_summary",
            "reason",
            "status",
            "flagged_organisation",
            "raised_by",
            "raised_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_target_summary(self, obj):
        return resolve_target_summary(obj.target_type, obj.target_id)

    def get_flagged_organisation(self, obj):
        return serialize_flagged_organisation(obj)


class ComplianceFlagDetailSerializer(ComplianceFlagListSerializer):
    description = serializers.CharField(read_only=True)
    evidence_ref = serializers.CharField(read_only=True)
    responses = FlagResponseSerializer(many=True, read_only=True)
    recommendation = AdminRecommendationSerializer(read_only=True)

    class Meta(ComplianceFlagListSerializer.Meta):
        fields = ComplianceFlagListSerializer.Meta.fields + [
            "description",
            "evidence_ref",
            "responses",
            "recommendation",
        ]


class ComplianceFlagWriteSerializer(serializers.ModelSerializer):
    flagged_organisation_type = serializers.ChoiceField(choices=["supplier", "branch"], write_only=True)
    flagged_organisation_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ComplianceFlag
        fields = [
            "target_type",
            "target_id",
            "reason",
            "description",
            "evidence_ref",
            "flagged_organisation_type",
            "flagged_organisation_id",
        ]

    def validate(self, attrs):
        org_type = attrs.pop("flagged_organisation_type")
        org_id = attrs.pop("flagged_organisation_id")

        if org_type == "supplier":
            from supply_chain.models import Supplier

            supplier = Supplier.objects.filter(pk=org_id).first()
            if not supplier:
                raise serializers.ValidationError({"flagged_organisation_id": "Supplier not found."})
            attrs["flagged_supplier"] = supplier
            attrs["flagged_branch"] = None
        else:
            from supply_chain.models import Branch

            branch = Branch.objects.filter(pk=org_id).first()
            if not branch:
                raise serializers.ValidationError({"flagged_organisation_id": "Branch not found."})
            attrs["flagged_branch"] = branch
            attrs["flagged_supplier"] = None

        return attrs


class ComplianceFlagStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFlag
        fields = ["status"]


class RecommendationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminRecommendation
        fields = ["recommended_action", "justification"]


class RecommendationDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminRecommendation
        fields = ["admin_decision", "admin_decision_note"]

    def validate_admin_decision(self, value):
        if value not in [AdminRecommendation.AdminDecision.ACTIONED, AdminRecommendation.AdminDecision.DISMISSED]:
            raise serializers.ValidationError("Decision must be actioned or dismissed.")
        return value

    def validate(self, attrs):
        note = attrs.get("admin_decision_note")
        if note is None and self.instance is not None:
            note = self.instance.admin_decision_note
        if not (note or "").strip():
            raise serializers.ValidationError({"admin_decision_note": "A decision note is required."})
        attrs["admin_decision_note"] = note.strip()
        return attrs


class OrganisationCertificateSerializer(serializers.ModelSerializer):
    organisation = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True)
    document_url = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OrganisationCertificate
        fields = [
            "id",
            "organisation",
            "document_type",
            "document_type_display",
            "certificate_number",
            "issuing_authority",
            "issued_on",
            "expires_on",
            "notes",
            "document_url",
            "status",
            "status_display",
            "is_active",
            "uploaded_by",
            "uploaded_by_username",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
            "review_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_organisation(self, obj):
        from .services import serialize_certificate_organisation

        return serialize_certificate_organisation(obj)

    def get_document_url(self, obj):
        request = self.context.get("request")
        if not obj.document:
            return None
        url = obj.document.url
        if request:
            return request.build_absolute_uri(url)
        return url


class OrganisationCertificateUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganisationCertificate
        fields = [
            "document_type",
            "certificate_number",
            "issuing_authority",
            "issued_on",
            "expires_on",
            "notes",
            "document",
        ]

    def validate_expires_on(self, value):
        from django.utils import timezone

        if value < timezone.now().date():
            raise serializers.ValidationError("Expiry date must be today or in the future.")
        return value

    def validate_document(self, value):
        if not value:
            raise serializers.ValidationError("A certificate file is required.")
        max_bytes = 5 * 1024 * 1024
        if getattr(value, "size", 0) > max_bytes:
            raise serializers.ValidationError("File must be 5MB or smaller.")
        name = (getattr(value, "name", "") or "").lower()
        allowed = (".pdf", ".png", ".jpg", ".jpeg", ".webp")
        if not name.endswith(allowed):
            raise serializers.ValidationError("Upload a PDF or image file (png/jpg/webp).")
        return value


class OrganisationCertificateReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["verified", "rejected"])
    review_note = serializers.CharField(required=False, allow_blank=True)
    expires_on = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs["decision"] == "rejected" and not (attrs.get("review_note") or "").strip():
            raise serializers.ValidationError({"review_note": "A rejection reason is required."})
        return attrs
