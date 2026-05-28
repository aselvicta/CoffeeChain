from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AuditLog,
    BlockchainAnchor,
    Branch,
    DeliveryProof,
    Farmer,
    FertilizerBatch,
    Warehouse,
    OTPVerification,
    Supplier,
    Transfer,
)
from .permissions import (
    CooperativeOrAdmin,
    IsAdmin,
    IsCooperative,
    IsRegulator,
    IsRetailer,
    IsSupplier,
    RegulatorOrAdmin,
    SupplierOrAdmin,
)
from .serializers import (
    AdminUserCreateSerializer,
    AuditLogSerializer,
    BlockchainAnchorSerializer,
    BranchSerializer,
    DeliveryProofSerializer,
    FarmerSerializer,
    FertilizerBatchSerializer,
    WarehouseSerializer,
    OTPVerificationSerializer,
    SupplierSerializer,
    TransferSerializer,
    UserSerializer,
)
from .services.blockchain import anchor_to_polygon, build_hash
from .services.ipfs import store_file, store_json
from .services.ministry_of_agriculture import fetch_farmer
from .services.otp import generate_code, is_expired, send_sms

import logging

logger = logging.getLogger(__name__)


def resolve_role(user):
    if user.is_staff:
        return "admin"
    group_names = set(user.groups.values_list("name", flat=True))
    if "Supplier" in group_names:
        return "supplier"
    if "Retailer" in group_names:
        return "retailer"
    if "Cooperative" in group_names:
        return "cooperative"
    if "Regulator" in group_names:
        return "regulator"
    return "user"


def build_user_payload(user):
    role = resolve_role(user)
    supplier = Supplier.objects.filter(user=user).first()
    branch = Branch.objects.filter(user=user).first()
    return {
        "user": UserSerializer(user).data,
        "role": role,
        "supplier": SupplierSerializer(supplier).data if supplier else None,
        "branch": BranchSerializer(branch).data if branch else None,
    }


class AdminUserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        users = User.objects.all().order_by("username")
        return Response([build_user_payload(user) for user in users])

    def create(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(username=data["username"]).exists():
            return Response(
                {"detail": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User.objects.create_user(
                username=data["username"],
                password=data["password"],
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                email=data.get("email", ""),
            )

            role = data["role"]
            if role == "admin":
                user.is_staff = True
                user.is_superuser = True
                user.save(update_fields=["is_staff", "is_superuser"])
            else:
                group, _ = Group.objects.get_or_create(name=role.capitalize())
                user.groups.add(group)

            if role == "supplier":
                Supplier.objects.create(
                    name=data.get("supplier_name") or user.username,
                    user=user,
                    region=data.get("supplier_region", ""),
                    contact_phone=data.get("contact_phone", ""),
                )
            if role in {"retailer", "cooperative", "regulator"}:
                Branch.objects.create(
                    name=data.get("branch_name") or user.username,
                    branch_type=data.get("branch_type") or Branch.RETAILER,
                    district=data.get("district", ""),
                    region=data.get("region", ""),
                    user=user,
                )

        return Response(build_user_payload(user), status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = resolve_role(request.user)
        supplier = None
        branch = None
        if role == "supplier":
            supplier = Supplier.objects.filter(user=request.user).first()
        if role in {"retailer", "cooperative", "regulator"}:
            branch = Branch.objects.filter(user=request.user).first()
        payload = {
            "user": UserSerializer(request.user).data,
            "role": role,
            "supplier": SupplierSerializer(supplier).data if supplier else None,
            "branch": BranchSerializer(branch).data if branch else None,
        }
        return Response(payload)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdmin]


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAdmin]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

    def get_permissions(self):
        # allow any authenticated user to list and retrieve warehouses
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        # creation and deletion restricted to suppliers or admins
        return [IsAuthenticated(), SupplierOrAdmin()]


class FarmerViewSet(viewsets.ModelViewSet):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer
    permission_classes = [IsAdmin]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "lookup"]:
            return [IsAuthenticated()]
        if self.action == "register":
            return [IsAuthenticated(), CooperativeOrAdmin()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = Farmer.objects.select_related("cooperative").order_by("name")
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        role = resolve_role(user)
        if role == "cooperative":
            branch = Branch.objects.filter(user=user).first()
            if branch:
                return qs.filter(cooperative=branch)
            return qs.none()
        return qs

    @action(detail=False, methods=["get"])
    def lookup(self, request):
        """Fetch farmer details from the Ministry of Agriculture registry.

        Used by cooperatives to preview farmer information before registering
        them. Does not write to the database.
        """
        ministry_id = (request.query_params.get("ministry_id") or "").strip()
        if not ministry_id:
            return Response(
                {"detail": "ministry_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record = fetch_farmer(ministry_id)
        if not record:
            return Response(
                {
                    "detail": f"No farmer found in the Ministry registry with ID {ministry_id}.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = (
            Farmer.objects.select_related("cooperative")
            .filter(ministry_id=ministry_id)
            .first()
        )
        return Response(
            {
                "ministry_id": record.ministry_id,
                "name": record.name,
                "phone_number": record.phone_number,
                "region": record.region,
                "district": record.district,
                "cooperative_name": record.cooperative_name,
                "is_registered": existing is not None
                and existing.cooperative is not None,
                "current_cooperative": (
                    BranchSerializer(existing.cooperative).data
                    if existing and existing.cooperative
                    else None
                ),
            }
        )

    @action(detail=False, methods=["post"])
    def register(self, request):
        """Register a farmer to a cooperative using the Ministry registry as the
        source of truth. Cooperatives can only register farmers to their own
        branch; admins may specify ``cooperative_id`` to target any branch.
        """
        ministry_id = (request.data.get("ministry_id") or "").strip()
        if not ministry_id:
            return Response(
                {"detail": "ministry_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record = fetch_farmer(ministry_id)
        if not record:
            return Response(
                {
                    "detail": (
                        f"No farmer found in the Ministry registry with ID "
                        f"{ministry_id}. Verify the ID and try again."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        role = resolve_role(request.user)
        branch = None
        if role == "cooperative":
            branch = Branch.objects.filter(user=request.user).first()
            if not branch:
                return Response(
                    {"detail": "No cooperative branch is assigned to this account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            cooperative_id = request.data.get("cooperative_id")
            if cooperative_id:
                branch = Branch.objects.filter(
                    id=cooperative_id, branch_type=Branch.COOPERATIVE
                ).first()
            if not branch and record.cooperative_name:
                branch = Branch.objects.filter(
                    name__iexact=record.cooperative_name,
                    branch_type=Branch.COOPERATIVE,
                ).first()
            if not branch:
                return Response(
                    {
                        "detail": (
                            "Unable to determine target cooperative. Provide "
                            "cooperative_id or ensure the Ministry record "
                            "references a known cooperative."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existing = Farmer.objects.filter(ministry_id=record.ministry_id).first()
        if (
            existing
            and existing.cooperative
            and existing.cooperative_id != branch.id
            and role != "admin"
        ):
            return Response(
                {
                    "detail": (
                        f"Farmer {record.ministry_id} is already registered with "
                        f"{existing.cooperative.name}. Contact an administrator "
                        "to transfer registration."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        farmer, created = Farmer.objects.update_or_create(
            ministry_id=record.ministry_id,
            defaults={
                "name": record.name,
                "phone_number": record.phone_number,
                "district": record.district,
                "cooperative": branch,
            },
        )
        AuditLog.objects.create(
            action="farmer_registered" if created else "farmer_re_registered",
            user=request.user,
            details={
                "ministry_id": farmer.ministry_id,
                "cooperative": branch.name,
                "branch_id": branch.id,
            },
        )
        return Response(
            FarmerSerializer(farmer).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class FertilizerBatchViewSet(viewsets.ModelViewSet):
    queryset = FertilizerBatch.objects.all()
    serializer_class = FertilizerBatchSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), SupplierOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        batch = serializer.save()
        AuditLog.objects.create(
            action="batch_created",
            user=self.request.user,
            details={"batch": batch.batch_code},
        )


class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all().select_related(
        "batch", "from_supplier", "from_branch", "to_branch", "farmer"
    )
    serializer_class = TransferSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        transfer = serializer.save(created_by=self.request.user)
        AuditLog.objects.create(
            action="transfer_created",
            user=self.request.user,
            transfer=transfer,
            details={"status": transfer.status, "transfer_type": transfer.transfer_type},
        )

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        transfer = self.get_object()
        transfer.status = Transfer.RECEIVED
        transfer.save(update_fields=["status"])
        AuditLog.objects.create(
            action="transfer_received",
            user=request.user,
            transfer=transfer,
        )
        return Response(TransferSerializer(transfer).data)

    @action(detail=True, methods=["post"])
    def send_otp(self, request, pk=None):
        transfer = self.get_object()
        if transfer.transfer_type != Transfer.BRANCH_TO_FARMER or not transfer.farmer:
            return Response(
                {"detail": "OTP verification only applies to farmer distributions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = generate_code()
        otp_record, _ = OTPVerification.objects.update_or_create(
            transfer=transfer,
            defaults={
                "phone_number": transfer.farmer.phone_number,
                "code": code,
                "status": OTPVerification.SENT,
                "sent_at": timezone.now(),
                "verified_at": None,
                "attempts": 0,
            },
        )
        sms_payload = send_sms(otp_record.phone_number, code)
        AuditLog.objects.create(
            action="otp_sent",
            user=request.user,
            transfer=transfer,
            details={"phone_number": otp_record.phone_number},
        )
        return Response(
            {"otp": OTPVerificationSerializer(otp_record).data, "sms": sms_payload}
        )

    @action(detail=True, methods=["post"])
    def verify_otp(self, request, pk=None):
        transfer = self.get_object()
        code = request.data.get("code", "")
        try:
            otp_record = transfer.otp_verification
        except OTPVerification.DoesNotExist:
            return Response(
                {"detail": "No OTP request found for this transfer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_expired(otp_record.sent_at):
            otp_record.status = OTPVerification.EXPIRED
            otp_record.save(update_fields=["status"])
            return Response(
                {"detail": "OTP expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.attempts += 1
        if otp_record.code != str(code).strip():
            otp_record.status = OTPVerification.FAILED
            otp_record.save(update_fields=["status", "attempts"])
            return Response(
                {"detail": "Invalid OTP code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            otp_record.status = OTPVerification.VERIFIED
            otp_record.verified_at = timezone.now()
            otp_record.save(update_fields=["status", "verified_at", "attempts"])
            transfer.status = Transfer.VERIFIED
            transfer.save(update_fields=["status"])

        anchor_summary = self._record_verification_proof(transfer, request.user)

        AuditLog.objects.create(
            action="otp_verified",
            user=request.user,
            transfer=transfer,
            details=anchor_summary,
        )

        response_payload = TransferSerializer(transfer).data
        response_payload["verification"] = anchor_summary
        return Response(response_payload)

    def _record_verification_proof(self, transfer, user):
        """Upload the verification receipt to Storacha and anchor on Polygon.

        Returns a summary dict that the caller can store in audit logs and
        forward to the client. Failures in Storacha or the chain are logged
        but do not roll back the OTP verification.
        """
        if hasattr(transfer, "blockchain_anchor"):
            existing = transfer.blockchain_anchor
            return {
                "cid": existing.payload.get("cid", ""),
                "tx_hash": existing.tx_hash,
                "data_hash": existing.data_hash,
                "network": existing.network,
                "storage_url": existing.payload.get("storage_url"),
                "storage_is_remote": existing.payload.get("storage_is_remote", False),
                "storacha_ok": existing.payload.get(
                    "storacha_ok", bool(existing.payload.get("cid"))
                ),
                "blockchain_ok": existing.payload.get(
                    "blockchain_ok", bool(existing.tx_hash)
                ),
                "explorer_url": (
                    f"https://amoy.polygonscan.com/tx/{existing.tx_hash}"
                    if existing.tx_hash
                    else None
                ),
                "anchored_at": existing.anchored_at.isoformat(),
                "already_anchored": True,
            }

        latest_proof = transfer.proofs.order_by("-uploaded_at").first()
        receipt = {
            "transfer_id": transfer.id,
            "transfer_type": transfer.transfer_type,
            "batch": {
                "id": transfer.batch_id,
                "code": transfer.batch.batch_code if transfer.batch else None,
                "fertilizer_type": (
                    transfer.batch.fertilizer_type if transfer.batch else None
                ),
            },
            "quantity_bags": transfer.quantity_bags,
            "farmer": (
                {
                    "ministry_id": transfer.farmer.ministry_id,
                    "name": transfer.farmer.name,
                    "phone_number": transfer.farmer.phone_number,
                    "district": transfer.farmer.district,
                }
                if transfer.farmer
                else None
            ),
            "cooperative": (
                {
                    "id": transfer.from_branch.id,
                    "name": transfer.from_branch.name,
                    "district": transfer.from_branch.district,
                    "region": transfer.from_branch.region,
                }
                if transfer.from_branch
                else None
            ),
            "supplier": (
                transfer.from_supplier.name if transfer.from_supplier else None
            ),
            "delivery_proof_file_cid": latest_proof.cid if latest_proof else None,
            "verified_at": timezone.now().isoformat(),
            "verified_by": user.username if user and user.is_authenticated else None,
            "otp_attempts": (
                transfer.otp_verification.attempts
                if hasattr(transfer, "otp_verification")
                else None
            ),
        }

        storage_result = store_json(f"transfer-{transfer.id}-receipt", receipt)
        cid = storage_result.cid
        storacha_ok = storage_result.is_remote
        storacha_error = storage_result.error

        payload_signature = (
            f"{receipt['batch'].get('code') or ''}|"
            f"{transfer.quantity_bags}|"
            f"{cid}|"
            f"{transfer.id}|"
            f"{receipt['verified_at']}"
        )
        data_hash = build_hash(payload_signature)

        tx_hash = ""
        blockchain_ok = False
        chain_error = ""
        chain_timestamp = ""
        try:
            tx_payload = anchor_to_polygon(str(transfer.id), data_hash)
            tx_hash = tx_payload["tx_hash"]
            chain_timestamp = tx_payload["timestamp"]
            blockchain_ok = True
        except Exception as exc:
            chain_error = str(exc)
            logger.exception("Polygon anchoring failed for transfer %s", transfer.id)

        anchor_payload = {
            "cid": cid,
            "storage_url": storage_result.url,
            "storage_is_remote": storage_result.is_remote,
            "timestamp": chain_timestamp,
            "receipt_summary": {
                "batch_code": receipt["batch"].get("code"),
                "farmer_ministry_id": (
                    receipt["farmer"]["ministry_id"] if receipt["farmer"] else None
                ),
                "cooperative_name": (
                    receipt["cooperative"]["name"] if receipt["cooperative"] else None
                ),
                "quantity_bags": transfer.quantity_bags,
            },
            "storacha_ok": storacha_ok,
            "blockchain_ok": blockchain_ok,
        }
        if storacha_error:
            anchor_payload["storacha_error"] = storacha_error
        if chain_error:
            anchor_payload["blockchain_error"] = chain_error

        BlockchainAnchor.objects.create(
            transfer=transfer,
            data_hash=data_hash,
            tx_hash=tx_hash,
            network="polygon-amoy",
            payload=anchor_payload,
        )

        return {
            "cid": cid,
            "tx_hash": tx_hash,
            "data_hash": data_hash,
            "network": "polygon-amoy",
            "storacha_ok": storacha_ok,
            "blockchain_ok": blockchain_ok,
            "storacha_error": storacha_error or None,
            "blockchain_error": chain_error or None,
            "storage_url": storage_result.url,
            "storage_is_remote": storage_result.is_remote,
            "explorer_url": (
                f"https://amoy.polygonscan.com/tx/{tx_hash}" if tx_hash else None
            ),
        }

    @action(detail=True, methods=["post"])
    def upload_proof(self, request, pk=None):
        transfer = self.get_object()
        file_obj = request.FILES.get("file")
        cid = ""
        if file_obj:
            cid = store_file(file_obj)

        proof = DeliveryProof.objects.create(
            transfer=transfer,
            file=file_obj,
            cid=cid,
            gps_lat=request.data.get("gps_lat") or None,
            gps_lng=request.data.get("gps_lng") or None,
            meta=request.data.get("meta") or {},
            uploaded_by=request.user,
        )
        AuditLog.objects.create(
            action="proof_uploaded",
            user=request.user,
            transfer=transfer,
            details={"cid": cid},
        )
        return Response(DeliveryProofSerializer(proof).data, status=status.HTTP_201_CREATED)


class DeliveryProofViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeliveryProof.objects.all()
    serializer_class = DeliveryProofSerializer
    permission_classes = [IsAuthenticated]


class OTPVerificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OTPVerification.objects.all()
    serializer_class = OTPVerificationSerializer
    permission_classes = [IsAuthenticated]


class BlockchainAnchorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BlockchainAnchor.objects.all()
    serializer_class = BlockchainAnchorSerializer
    permission_classes = [IsAuthenticated]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]


class AuditReportView(APIView):
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]

    def get(self, request):
        dispatched = Transfer.objects.filter(status=Transfer.DISPATCHED).count()
        received = Transfer.objects.filter(status=Transfer.RECEIVED).count()
        verified = Transfer.objects.filter(status=Transfer.VERIFIED).count()
        return Response(
            {
                "dispatched": dispatched,
                "received": received,
                "verified": verified,
                "gap": max(received - verified, 0),
            }
        )
