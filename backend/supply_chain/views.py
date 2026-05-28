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
from .services.ipfs import store_file
from .services.otp import generate_code, is_expired, send_sms


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
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAdmin()]


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

            if not hasattr(transfer, "blockchain_anchor"):
                cid = ""
                latest_proof = transfer.proofs.order_by("-uploaded_at").first()
                if latest_proof:
                    cid = latest_proof.cid
                payload = f"{transfer.batch.batch_code}|{transfer.quantity_bags}|{cid}|{transfer.id}"
                data_hash = build_hash(payload)
                tx_payload = anchor_to_polygon(str(transfer.id), data_hash)
                BlockchainAnchor.objects.create(
                    transfer=transfer,
                    data_hash=data_hash,
                    tx_hash=tx_payload["tx_hash"],
                    payload={"cid": cid, "timestamp": tx_payload["timestamp"]},
                )

        AuditLog.objects.create(
            action="otp_verified",
            user=request.user,
            transfer=transfer,
        )
        return Response(TransferSerializer(transfer).data)

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
