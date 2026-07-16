import re

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import Group, User
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
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
    Issue,
    Notification,
    Order,
    PendingRegistration,
    UserProfile,
    Warehouse,
    OTPVerification,
    Supplier,
    Transfer,
    WarehouseManager,
)
from .permissions import (
    BranchStaffOrAdmin,
    CooperativeOrAdmin,
    IsAdmin,
    IsCooperative,
    IsRegulator,
    IsRetailer,
    IsSupplier,
    IsWarehouseManager,
    RegulatorOrAdmin,
    SupplierOrAdmin,
    WarehouseManagerOrAdmin,
)
from .serializers import (
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    AuditLogSerializer,
    BlockchainAnchorSerializer,
    BranchSerializer,
    DeliveryProofSerializer,
    FarmerSerializer,
    FertilizerBatchSerializer,
    IssueSerializer,
    NotificationSerializer,
    OrderSerializer,
    PendingRegistrationSerializer,
    PublicRegisterSerializer,
    WarehouseSerializer,
    OTPVerificationSerializer,
    SupplierSerializer,
    TransferSerializer,
    UserSerializer,
    WarehouseManagerSerializer,
)
from .services.blockchain import anchor_to_polygon, build_hash, build_payload_signature
from .services.ipfs import (
    load_receipt,
    normalize_receipt_access,
    save_receipt_bytes,
    save_receipt_local,
    save_receipt_to_db,
    store_file,
    store_json,
)
from .services.integrity import (
    compare_transfers,
    list_verified_transfers,
    verify_transfer_integrity,
)
from .services.ministry_of_agriculture import fetch_farmer
from .services.notifications import (
    notify_for_farmer_registered,
    notify_for_integrity_mismatch,
    notify_for_integrity_restored,
    notify_for_otp_sent,
    notify_for_otp_verified,
    notify_for_transfer_created,
    notify_for_transfer_pending,
    notify_for_transfer_received,
    notify_for_transfer_rejected,
)
from .services.farmer_otp import issue_distribution_otp, verify_farmer_otp
from .services.record_audit import (
    build_saved_field_changes,
    log_transfer_modification,
    snapshot_transfer,
)

import logging
import uuid

logger = logging.getLogger(__name__)

DEFAULT_FERTILIZER_TYPES = [
    "DAP",
    "CAN",
    "Urea",
    "NPK",
    "CAN+B",
    "Organic Compost",
]

ROLE_GROUP_NAMES = {
    "supplier": "Supplier",
    "warehouse_manager": "WarehouseManager",
    "retailer": "Retailer",
    "cooperative": "Cooperative",
    "regulator": "Regulator",
}


def group_name_for_role(role):
    return ROLE_GROUP_NAMES.get(role)


def resolve_role(user):
    if user.is_staff:
        return "admin"
    group_names = set(user.groups.values_list("name", flat=True))
    if "Supplier" in group_names:
        return "supplier"
    if "WarehouseManager" in group_names:
        return "warehouse_manager"
    if "Retailer" in group_names:
        return "retailer"
    if "Cooperative" in group_names:
        return "cooperative"
    if "Regulator" in group_names:
        return "regulator"
    return "user"


def user_can_view_transfer_receipt(user, transfer) -> bool:
    role = resolve_role(user)
    if role in {"admin", "regulator"}:
        return True
    if role == "supplier":
        supplier = Supplier.objects.filter(user=user).first()
        return bool(supplier and transfer.from_supplier_id == supplier.id)
    if role == "warehouse_manager":
        manager = WarehouseManager.objects.filter(user=user).first()
        return bool(manager and transfer.from_supplier_id == manager.supplier_id)
    if role in {"retailer", "cooperative"}:
        branch = Branch.objects.filter(user=user).first()
        if not branch:
            return False
        return transfer.to_branch_id == branch.id or transfer.from_branch_id == branch.id
    return False


def build_user_payload(user):
    role = resolve_role(user)
    supplier = Supplier.objects.filter(user=user).first()
    branch = Branch.objects.filter(user=user).first()
    warehouse_manager = (
        WarehouseManager.objects.filter(user=user).select_related("supplier").first()
    )
    return {
        "user": UserSerializer(user).data,
        "role": role,
        "supplier": SupplierSerializer(supplier).data if supplier else None,
        "branch": BranchSerializer(branch).data if branch else None,
        "warehouse_manager": (
            WarehouseManagerSerializer(warehouse_manager).data
            if warehouse_manager
            else None
        ),
    }


def _get_supplier_for_user(user):
    return Supplier.objects.filter(user=user).first()


def get_batch_available_quantity(batch):
    dispatched_total = (
        batch.transfers.filter(
            transfer_type=Transfer.SUPPLIER_TO_BRANCH,
            status__in=[
                Transfer.PENDING,
                Transfer.DISPATCHED,
                Transfer.RECEIVED,
                Transfer.VERIFIED,
            ],
        ).aggregate(total=Sum("quantity_bags"))["total"]
        or 0
    )
    return max(batch.quantity_bags - dispatched_total, 0)


def get_branch_available_quantity(batch, branch):
    """Bags a branch can still allocate to farmers for this batch."""
    if not branch:
        return 0
    received_total = (
        batch.transfers.filter(
            transfer_type=Transfer.SUPPLIER_TO_BRANCH,
            to_branch=branch,
            status__in=[Transfer.RECEIVED, Transfer.VERIFIED],
        ).aggregate(total=Sum("quantity_bags"))["total"]
        or 0
    )
    distributed_total = (
        batch.transfers.filter(
            transfer_type=Transfer.BRANCH_TO_FARMER,
            from_branch=branch,
        ).aggregate(total=Sum("quantity_bags"))["total"]
        or 0
    )
    return max(received_total - distributed_total, 0)


def build_warehouse_catalog(warehouses):
    catalog = []
    for warehouse in warehouses:
        items = []
        total_available = 0
        for batch in warehouse.batches.all().select_related("supplier"):
            available_bags = get_batch_available_quantity(batch)
            total_available += available_bags
            items.append(
                {
                    "batch_id": batch.id,
                    "batch_code": batch.batch_code,
                    "fertilizer_type": batch.fertilizer_type,
                    "available_bags": available_bags,
                    "total_bags": batch.quantity_bags,
                    "manufacturer": batch.manufacturer,
                    "production_date": batch.production_date,
                    "expiry_date": batch.expiry_date,
                    "certification_status": batch.certification_status,
                    "storage_location": warehouse.id,
                }
            )
        catalog.append(
            {
                "id": warehouse.id,
                "name": warehouse.name,
                "section": warehouse.section,
                "capacity_bags": warehouse.capacity_bags,
                "current_bags": warehouse.current_bags,
                "available_bags": total_available,
                "items": items,
            }
        )
    return catalog


def build_fertilizer_type_catalog():
    known_types = []
    seen = set()

    for fertilizer_type in DEFAULT_FERTILIZER_TYPES:
        normalized = fertilizer_type.strip()
        if normalized and normalized.lower() not in seen:
            seen.add(normalized.lower())
            known_types.append({"value": normalized, "label": normalized})

    for fertilizer_type in (
        FertilizerBatch.objects.order_by("fertilizer_type")
        .values_list("fertilizer_type", flat=True)
        .distinct()
    ):
        normalized = (fertilizer_type or "").strip()
        if normalized and normalized.lower() not in seen:
            seen.add(normalized.lower())
            known_types.append({"value": normalized, "label": normalized})

    return known_types


def recalculate_warehouse_current_bags(warehouse):
    if not warehouse:
        return
    current_bags = (
        warehouse.batches.aggregate(total=Sum("quantity_bags"))["total"]
        or 0
    )
    warehouse.current_bags = current_bags
    warehouse.save(update_fields=["current_bags"])


def validate_warehouse_capacity(warehouse, bags, exclude_batch_id=None):
    if not warehouse:
        return

    bags = int(bags or 0)
    existing_total = warehouse.batches.exclude(id=exclude_batch_id).aggregate(total=Sum("quantity_bags"))["total"] or 0
    projected_total = existing_total + bags
    if projected_total > warehouse.capacity_bags:
        remaining = max(warehouse.capacity_bags - existing_total, 0)
        raise ValidationError(
            {
                "storage_location_id": (
                    f"Adding {bags} bags would exceed the warehouse capacity of {warehouse.capacity_bags} bags. "
                    f"Only {remaining} bags can still be added here."
                )
            }
        )


class AdminUserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), RegulatorOrAdmin()]
        return [IsAuthenticated(), IsAdmin()]

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
                group_name = group_name_for_role(role)
                if not group_name:
                    return Response(
                        {"detail": "Unsupported role."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                group, _ = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)

            if role == "supplier":
                Supplier.objects.create(
                    name=data.get("supplier_name") or user.username,
                    user=user,
                    region=data.get("supplier_region", ""),
                    contact_phone=data.get("contact_phone", ""),
                )
            if role == "warehouse_manager":
                supplier_id = data.get("supplier_id")
                if not supplier_id:
                    return Response(
                        {"detail": "supplier_id is required for warehouse managers."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                supplier = get_object_or_404(Supplier, pk=supplier_id)
                WarehouseManager.objects.create(user=user, supplier=supplier)
            if role in {"retailer", "cooperative", "regulator"}:
                Branch.objects.create(
                    name=data.get("branch_name") or user.username,
                    branch_type=data.get("branch_type") or Branch.RETAILER,
                    district=data.get("district", ""),
                    region=data.get("region", ""),
                    user=user,
                )

        return Response(build_user_payload(user), status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        return Response(build_user_payload(user))

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk)

    def update(self, request, pk=None):
        return self._update_user(request, pk)

    def destroy(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            AuditLog.objects.create(
                action="user_deleted",
                user=request.user,
                details={"deleted_username": user.username, "deleted_user_id": user.id},
            )
            # Remove any PendingRegistration tied to this username so the
            # username can be freely re-used for a new registration.
            PendingRegistration.objects.filter(username=user.username).delete()
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _update_user(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            if "first_name" in data:
                user.first_name = data["first_name"]
            if "last_name" in data:
                user.last_name = data["last_name"]
            if "email" in data:
                user.email = data["email"]
            if "is_active" in data:
                user.is_active = data["is_active"]
                action = "user_activated" if data["is_active"] else "user_deactivated"
                AuditLog.objects.create(
                    action=action,
                    user=request.user,
                    details={"target_user": user.username},
                )
            if data.get("password"):
                user.set_password(data["password"])
            user.save()

            role = resolve_role(user)
            if role == "supplier":
                supplier = Supplier.objects.filter(user=user).first()
                if supplier:
                    if data.get("supplier_name"):
                        supplier.name = data["supplier_name"]
                    if "supplier_region" in data:
                        supplier.region = data["supplier_region"]
                    if "contact_phone" in data:
                        supplier.contact_phone = data["contact_phone"]
                    supplier.save()
            elif role in {"retailer", "cooperative", "regulator"}:
                branch = Branch.objects.filter(user=user).first()
                if branch:
                    if data.get("branch_name"):
                        branch.name = data["branch_name"]
                    if "branch_type" in data:
                        branch.branch_type = data["branch_type"]
                    if "region" in data:
                        branch.region = data["region"]
                    if "district" in data:
                        branch.district = data["district"]
                    if "contact_phone" in data:
                        branch.contact_phone = data["contact_phone"]
                    branch.save()
            elif role == "warehouse_manager":
                warehouse_id = data.get("warehouse_id")
                if "warehouse_id" in data:
                    manager = WarehouseManager.objects.filter(user=user).first()
                    if manager:
                        # Clear any previous assignment
                        Warehouse.objects.filter(assigned_manager=manager).update(assigned_manager=None)
                        if warehouse_id:
                            wh = Warehouse.objects.filter(pk=warehouse_id).first()
                            if wh:
                                wh.assigned_manager = manager
                                wh.save(update_fields=["assigned_manager"])

        return Response(build_user_payload(user))


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_me_payload(self, user):
        role = resolve_role(user)
        supplier = Supplier.objects.filter(user=user).first()
        branch = Branch.objects.filter(user=user).first()
        warehouse_manager = (
            WarehouseManager.objects.filter(user=user)
            .select_related("supplier")
            .first()
        )
        up = getattr(user, "profile", None)
        contact_phone = up.contact_phone if up else ""
        organization = up.organization if up else ""
        return {
            "user": UserSerializer(user).data,
            "role": role,
            "contact_phone": contact_phone,
            "organization": organization,
            "supplier": SupplierSerializer(supplier).data if supplier else None,
            "branch": BranchSerializer(branch).data if branch else None,
            "warehouse_manager": (
                WarehouseManagerSerializer(warehouse_manager).data
                if warehouse_manager
                else None
            ),
        }

    def get(self, request):
        return Response(self._build_me_payload(request.user))

    def patch(self, request):
        """Allow the current user to update their own profile fields."""
        user = request.user
        data = request.data

        if "username" in data:
            new_username = data["username"].strip()
            if not new_username or len(new_username) < 3:
                return Response(
                    {"detail": "Username must be at least 3 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if User.objects.exclude(pk=user.pk).filter(username=new_username).exists():
                return Response(
                    {"detail": "That username is already taken."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.username = new_username
        if "first_name" in data:
            user.first_name = data["first_name"]
        if "last_name" in data:
            user.last_name = data["last_name"]
        if "email" in data:
            user.email = data["email"]
        if data.get("new_password"):
            current_password = data.get("current_password", "")
            if not user.check_password(current_password):
                return Response(
                    {"detail": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.set_password(data["new_password"])
        user.save()

        if "contact_phone" in data or "organization" in data:
            up, _ = UserProfile.objects.get_or_create(user=user)
            if "contact_phone" in data:
                up.contact_phone = data["contact_phone"]
            if "organization" in data:
                up.organization = data["organization"]
            up.save()

        return Response(self._build_me_payload(user))


class ReceiptCallbackView(APIView):
    """Internal endpoint for upload-service to persist receipts when Storacha is down."""

    authentication_classes = []
    permission_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        expected = getattr(settings, "RECEIPT_CALLBACK_SECRET", "")
        provided = request.headers.get("X-Receipt-Callback-Token", "")
        if not expected or provided != expected:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "file is required."}, status=status.HTTP_400_BAD_REQUEST)

        name = (request.data.get("name") or file_obj.name or "receipt").strip()
        content = file_obj.read()
        result = save_receipt_bytes(name, content)
        return Response(
            {
                "success": True,
                "cid": result.cid,
                "url": result.url,
                "storage": "backend",
                "storacha_ok": False,
                "note": result.error,
            }
        )


class PublicRegisterView(APIView):
    """Open endpoint — anyone can submit a registration request."""
    permission_classes = []

    def post(self, request):
        import logging
        from django.contrib.auth.hashers import make_password
        from .services.briq import send_sms, normalize_phone_digits

        logger = logging.getLogger(__name__)
        serializer = PublicRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(username=data["username"]).exists():
            return Response(
                {"detail": "Username already taken. Please choose another."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if PendingRegistration.objects.filter(
            username=data["username"], status=PendingRegistration.PENDING
        ).exists():
            return Response(
                {"detail": "A registration request with this username is already pending review."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove any old approved/rejected record with the same username so the
        # DB-level UNIQUE constraint doesn't block the new insert.
        PendingRegistration.objects.filter(
            username=data["username"]
        ).exclude(status=PendingRegistration.PENDING).delete()

        first_name = data.get("first_name", "")
        org_name = data["organisation_name"]
        phone = data.get("contact_phone", "")
        role_display = {
            "supplier": "Supplier",
            "retailer": "Retailer",
            "cooperative": "Cooperative (AMCOS)",
        }.get(data["role"], data["role"].capitalize())

        PendingRegistration.objects.create(
            username=data["username"],
            email=data.get("email", ""),
            first_name=first_name,
            last_name=data.get("last_name", ""),
            password_hash=make_password(data["password"]),
            role=data["role"],
            organisation_name=org_name,
            contact_phone=phone,
            region=data.get("region", ""),
            district=data.get("district", ""),
        )

        # Notify all admins of the new registration request
        try:
            from .services.notifications import notify_admins
            role_label = role_display
            notify_admins(
                notification_type="system",
                title="New Registration Request",
                message=(
                    f"{first_name or org_name} has submitted a registration request "
                    f"as a {role_label}. Review it in the Registrations tab."
                ),
                details=f"Username: {data['username']} | Organisation: {org_name} | Phone: {phone}",
                priority="high",
            )
        except Exception:
            logger.exception("Failed to send admin notification for new registration")

        # Send SMS confirmation — non-fatal if it fails
        if phone:
            name = first_name or org_name
            sms_message = (
                f"Habari {name}, ombi lako la kujisajili CoffeeChain kama {role_display} "
                f"limepokelewa. Msimamizi atakuwasiliana nawe hivi karibuni. Asante!"
            )
            try:
                result = send_sms(phone, sms_message)
                if not result.get("delivered"):
                    logger.warning(
                        "Registration SMS not delivered to %s: %s",
                        phone, result.get("error"),
                    )
            except Exception:
                logger.exception("Failed to send registration SMS to %s", phone)

        return Response(
            {"detail": "Registration submitted successfully. An administrator will review and activate your account."},
            status=status.HTTP_201_CREATED,
        )


class PendingRegistrationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), RegulatorOrAdmin()]
        return [IsAuthenticated(), IsAdmin()]

    def list(self, request):
        status_filter = request.query_params.get("status", PendingRegistration.PENDING)
        qs = PendingRegistration.objects.select_related("reviewed_by").order_by("-created_at")
        if status_filter and status_filter != "all":
            qs = qs.filter(status=status_filter)
        return Response(PendingRegistrationSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        reg = get_object_or_404(
            PendingRegistration.objects.select_related("reviewed_by"),
            pk=pk,
        )
        return Response(PendingRegistrationSerializer(reg).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        reg = get_object_or_404(PendingRegistration, pk=pk)
        if reg.status != PendingRegistration.PENDING:
            return Response(
                {"detail": "This registration has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=reg.username).exists():
            return Response(
                {"detail": "A user with this username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = User(
                username=reg.username,
                email=reg.email,
                first_name=reg.first_name,
                last_name=reg.last_name,
                is_active=True,
            )
            user.password = reg.password_hash
            user.save()

            group_name = group_name_for_role(reg.role)
            if group_name:
                group, _ = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)

            if reg.role == "supplier":
                Supplier.objects.create(
                    name=reg.organisation_name or user.username,
                    user=user,
                    region=reg.region,
                    contact_phone=reg.contact_phone,
                )
            elif reg.role in {"retailer", "cooperative"}:
                branch_type = Branch.RETAILER if reg.role == "retailer" else Branch.COOPERATIVE
                Branch.objects.create(
                    name=reg.organisation_name or user.username,
                    branch_type=branch_type,
                    district=reg.district,
                    region=reg.region,
                    contact_phone=reg.contact_phone,
                    user=user,
                )

            reg.status = PendingRegistration.APPROVED
            reg.reviewed_by = request.user
            reg.reviewed_at = timezone.now()
            reg.created_user = user
            reg.save()

            AuditLog.objects.create(
                action="registration_approved",
                user=request.user,
                details={"username": reg.username, "role": reg.role},
            )

        return Response(
            {"detail": f"Account for {reg.username} has been approved and activated.", "user_id": user.id},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        import logging
        from .services.briq import send_sms

        logger = logging.getLogger(__name__)

        reg = get_object_or_404(PendingRegistration, pk=pk)
        if reg.status != PendingRegistration.PENDING:
            return Response(
                {"detail": "This registration has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = (request.data.get("reason") or "").strip()
        reg.status = PendingRegistration.REJECTED
        reg.reviewed_by = request.user
        reg.reviewed_at = timezone.now()
        reg.rejection_reason = reason
        reg.save()
        AuditLog.objects.create(
            action="registration_rejected",
            user=request.user,
            details={"username": reg.username, "role": reg.role, "reason": reason},
        )

        # Send SMS to the applicant with the rejection reason
        if reg.contact_phone:
            name = reg.first_name or reg.organisation_name or reg.username
            if reason:
                sms_body = (
                    f"Habari {name}, ombi lako la kujisajili CoffeeChain limekataliwa. "
                    f"Sababu: {reason}. Wasiliana na msimamizi kwa maelezo zaidi."
                )
            else:
                sms_body = (
                    f"Habari {name}, ombi lako la kujisajili CoffeeChain limekataliwa. "
                    f"Wasiliana na msimamizi kwa maelezo zaidi."
                )
            try:
                result = send_sms(reg.contact_phone, sms_body[:160])
                if not result.get("delivered"):
                    logger.warning(
                        "Rejection SMS not delivered to %s: %s",
                        reg.contact_phone, result.get("error"),
                    )
            except Exception:
                logger.exception("Failed to send rejection SMS to %s", reg.contact_phone)

        return Response({"detail": f"Registration for {reg.username} has been rejected."})


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated(), RegulatorOrAdmin()]
        return [IsAuthenticated(), IsAdmin()]


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


class WarehouseCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        warehouses = Warehouse.objects.all().order_by("name").prefetch_related(
            "batches__transfers", "batches__supplier"
        )
        return Response(build_warehouse_catalog(warehouses))


class FertilizerTypeCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_fertilizer_type_catalog())


class FarmerViewSet(viewsets.ModelViewSet):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer
    permission_classes = [IsAdmin]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "lookup"]:
            return [IsAuthenticated()]
        if self.action == "register":
            return [IsAuthenticated(), CooperativeOrAdmin()]
        if self.action == "resolve_buyer":
            return [IsAuthenticated(), IsRetailer()]
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
        if role == "retailer":
            branch = Branch.objects.filter(user=user, branch_type=Branch.RETAILER).first()
            if not branch:
                return qs.none()
            sold_ids = (
                Transfer.objects.filter(
                    from_branch=branch,
                    transfer_type=Transfer.BRANCH_TO_FARMER,
                    farmer_id__isnull=False,
                )
                .values_list("farmer_id", flat=True)
                .distinct()
            )
            return qs.filter(id__in=sold_ids)
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
                "discount_eligible": True,
                "discount_percent": getattr(
                    settings, "RETAILER_MINISTRY_DISCOUNT_PERCENT", 10
                ),
            }
        )

    @action(detail=False, methods=["post"])
    def resolve_buyer(self, request):
        """Resolve a buyer at retailer point-of-sale without AMCOS registration.

        - Ministry ID: match registry, eligible for subsidy discount.
        - Walk-in: name + phone only, no Ministry ID, no discount.
        """
        ministry_id = (request.data.get("ministry_id") or "").strip()
        walk_in_name = (request.data.get("name") or "").strip()
        walk_in_phone = (request.data.get("phone_number") or "").strip()

        retailer_branch = Branch.objects.filter(
            user=request.user, branch_type=Branch.RETAILER
        ).first()
        if not retailer_branch:
            return Response(
                {"detail": "No retailer branch is assigned to this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discount_rate = getattr(settings, "RETAILER_MINISTRY_DISCOUNT_PERCENT", 10)

        if ministry_id:
            record = fetch_farmer(ministry_id)
            if not record:
                return Response(
                    {
                        "detail": (
                            f"No farmer found in the Ministry registry with ID "
                            f"{ministry_id}."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )
            coop_branch = None
            if record.cooperative_name:
                coop_branch = Branch.objects.filter(
                    name__iexact=record.cooperative_name,
                    branch_type=Branch.COOPERATIVE,
                ).first()
            farmer, _ = Farmer.objects.update_or_create(
                ministry_id=record.ministry_id,
                defaults={
                    "name": record.name,
                    "phone_number": record.phone_number,
                    "district": record.district,
                    "cooperative": coop_branch,
                },
            )
            return Response(
                {
                    "farmer": FarmerSerializer(farmer).data,
                    "farmer_id": farmer.id,
                    "buyer_type": Transfer.BUYER_MINISTRY,
                    "ministry_verified": True,
                    "discount_percent": discount_rate,
                    "discount_eligible": True,
                    "message": (
                        f"Ministry ID verified. {discount_rate}% subsidy discount applies."
                    ),
                }
            )

        if not walk_in_name or not walk_in_phone:
            return Response(
                {
                    "detail": (
                        "Provide ministry_id for registered farmers, or name and "
                        "phone_number for walk-in customers."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        walk_in_id = f"WALKIN-{retailer_branch.id}-{uuid.uuid4().hex[:10].upper()}"
        farmer = Farmer.objects.create(
            ministry_id=walk_in_id,
            name=walk_in_name,
            phone_number=walk_in_phone,
            district=retailer_branch.district or "",
            cooperative=None,
        )
        return Response(
            {
                "farmer": FarmerSerializer(farmer).data,
                "farmer_id": farmer.id,
                "buyer_type": Transfer.BUYER_WALK_IN,
                "ministry_verified": False,
                "discount_percent": 0,
                "discount_eligible": False,
                "message": "Walk-in sale recorded. No Ministry subsidy discount.",
            },
            status=status.HTTP_201_CREATED,
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
        if role == "retailer":
            return Response(
                {
                    "detail": (
                        "Retailers do not register farmers. Look up a Ministry ID "
                        "at point of sale or record a walk-in buyer."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

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
        notify_for_farmer_registered(farmer, branch, actor=request.user)
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
        warehouse = serializer.validated_data.get("storage_location")
        quantity_bags = serializer.validated_data.get("quantity_bags")
        validate_warehouse_capacity(warehouse, quantity_bags)
        batch = serializer.save()
        recalculate_warehouse_current_bags(batch.storage_location)
        AuditLog.objects.create(
            action="batch_created",
            user=self.request.user,
            details={"batch": batch.batch_code},
        )

    def perform_update(self, serializer):
        batch = serializer.instance
        previous_warehouse = batch.storage_location
        warehouse = serializer.validated_data.get("storage_location", previous_warehouse)
        quantity_bags = serializer.validated_data.get("quantity_bags", batch.quantity_bags)
        validate_warehouse_capacity(warehouse, quantity_bags, exclude_batch_id=batch.id)
        batch = serializer.save()
        recalculate_warehouse_current_bags(previous_warehouse)
        recalculate_warehouse_current_bags(batch.storage_location)

    def perform_destroy(self, instance):
        previous_warehouse = instance.storage_location
        instance.delete()
        recalculate_warehouse_current_bags(previous_warehouse)


class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all().select_related(
        "batch", "warehouse", "from_supplier", "from_branch", "to_branch", "farmer"
    )
    serializer_class = TransferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        role = resolve_role(self.request.user)

        if role == "warehouse_manager":
            manager = WarehouseManager.objects.filter(user=self.request.user).first()
            if manager:
                queryset = queryset.filter(from_supplier_id=manager.supplier_id)
            else:
                queryset = queryset.none()

        supplier_id = (params.get("supplier_id") or params.get("from_supplier_id") or "").strip()
        if supplier_id:
            queryset = queryset.filter(from_supplier_id=supplier_id)

        transfer_type = (params.get("transfer_type") or "").strip()
        if transfer_type:
            queryset = queryset.filter(transfer_type=transfer_type)

        status_filter = (params.get("status") or "").strip()
        if status_filter and status_filter.lower() != "all":
            queryset = queryset.filter(status=status_filter)

        search = (params.get("search") or params.get("q") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(batch__batch_code__icontains=search)
                | Q(batch__fertilizer_type__icontains=search)
                | Q(to_branch__name__icontains=search)
                | Q(receiver_name__icontains=search)
                | Q(receiver_organisation__icontains=search)
                | Q(warehouse__name__icontains=search)
            )

        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        transfer = serializer.instance
        payload = TransferSerializer(transfer).data
        if transfer.transfer_type == Transfer.BRANCH_TO_FARMER and transfer.farmer_id:
            payload.update(
                issue_distribution_otp(transfer, user=request.user)
            )
        headers = self.get_success_headers(payload)
        return Response(payload, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        batch = serializer.validated_data["batch"]
        transfer_type = serializer.validated_data.get("transfer_type")
        requested_bags = serializer.validated_data["quantity_bags"]

        if transfer_type == Transfer.BRANCH_TO_FARMER:
            from_branch = serializer.validated_data.get("from_branch")
            farmer = serializer.validated_data.get("farmer")
            if not from_branch:
                raise ValidationError({"from_branch_id": "from_branch is required."})
            if not farmer:
                raise ValidationError({"farmer_id": "farmer is required."})
            if (
                from_branch.branch_type == Branch.COOPERATIVE
                and farmer.cooperative_id
                and farmer.cooperative_id != from_branch.id
            ):
                raise ValidationError(
                    {
                        "farmer_id": (
                            f"Farmer {farmer.ministry_id} is registered with "
                            f"{farmer.cooperative.name}, not this AMCOS."
                        )
                    }
                )
            available_bags = get_branch_available_quantity(batch, from_branch)
            if requested_bags > available_bags:
                raise ValidationError(
                    {
                        "quantity_bags": (
                            f"Only {available_bags} bags remain for this batch at your branch. "
                            "Confirm supplier receipts before distributing."
                        )
                    }
                )
            warehouse = serializer.validated_data.get("warehouse") or batch.storage_location
            buyer_type = serializer.validated_data.get("buyer_type") or Transfer.BUYER_MINISTRY
            if farmer.ministry_id.startswith("WALKIN-"):
                buyer_type = Transfer.BUYER_WALK_IN
            ministry_verified = serializer.validated_data.get("ministry_verified")
            if ministry_verified is None:
                ministry_verified = buyer_type == Transfer.BUYER_MINISTRY
            discount_percent = serializer.validated_data.get("discount_percent")
            if discount_percent is None:
                discount_percent = (
                    getattr(settings, "RETAILER_MINISTRY_DISCOUNT_PERCENT", 10)
                    if ministry_verified
                    else 0
                )
            transfer = serializer.save(
                created_by=self.request.user,
                warehouse=warehouse,
                buyer_type=buyer_type,
                ministry_verified=ministry_verified,
                discount_percent=discount_percent,
            )
        else:
            warehouse = serializer.validated_data.get("warehouse") or batch.storage_location
            if not warehouse:
                raise ValidationError({"warehouse_id": "Select a warehouse for this dispatch."})
            if batch.storage_location and batch.storage_location_id != warehouse.id:
                raise ValidationError(
                    {"warehouse_id": "This batch is not stored in the selected warehouse."}
                )

            available_bags = get_batch_available_quantity(batch)
            if requested_bags > available_bags:
                raise ValidationError(
                    {
                        "quantity_bags": (
                            f"Only {available_bags} bags are available for dispatch from this warehouse."
                        )
                    }
                )

            transfer = serializer.save(
                created_by=self.request.user,
                warehouse=warehouse,
                status=Transfer.PENDING,
            )
            AuditLog.objects.create(
                action="transfer_created",
                user=self.request.user,
                transfer=transfer,
                details={
                    "status": transfer.status,
                    "transfer_type": transfer.transfer_type,
                },
            )
            notify_for_transfer_pending(transfer, actor=self.request.user)
            return

        AuditLog.objects.create(
            action="transfer_created",
            user=self.request.user,
            transfer=transfer,
            details={"status": transfer.status, "transfer_type": transfer.transfer_type},
        )
        notify_for_transfer_created(transfer, actor=self.request.user)

    def perform_update(self, serializer):
        transfer = serializer.instance
        before = snapshot_transfer(transfer)
        transfer = serializer.save()
        changes = build_saved_field_changes(before, transfer)
        request = self.request
        endpoint = getattr(request, "path", "") if request else ""
        log_transfer_modification(
            user=getattr(request, "user", None),
            transfer=transfer,
            changes=changes,
            action="transfer_updated",
            endpoint=endpoint,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        role = resolve_role(request.user)

        if transfer.transfer_type != Transfer.SUPPLIER_TO_BRANCH:
            return Response(
                {"detail": "Only supplier dispatches require warehouse approval."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if transfer.status != Transfer.PENDING:
            return Response(
                {"detail": "Transfer is not pending approval."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == "warehouse_manager":
            manager = WarehouseManager.objects.filter(user=request.user).first()
            if not manager or transfer.from_supplier_id != manager.supplier_id:
                return Response(
                    {"detail": "You can only approve dispatches for your supplier."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        before = snapshot_transfer(transfer)
        transfer.status = Transfer.DISPATCHED
        transfer.save(update_fields=["status"])
        changes = build_saved_field_changes(before, transfer)
        AuditLog.objects.create(
            action="transfer_approved",
            user=request.user,
            transfer=transfer,
            details={
                "via": "api",
                "endpoint": request.path,
                "model": "transfer",
                "changes": changes,
            },
        )
        notify_for_transfer_created(transfer, actor=request.user)
        return Response(TransferSerializer(transfer).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        role = resolve_role(request.user)
        message = (request.data.get("message") or "").strip()

        if transfer.transfer_type != Transfer.SUPPLIER_TO_BRANCH:
            return Response(
                {"detail": "Only supplier dispatches can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if transfer.status != Transfer.PENDING:
            return Response(
                {"detail": "Transfer is not pending approval."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not message:
            return Response(
                {"detail": "A rejection message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == "warehouse_manager":
            manager = WarehouseManager.objects.filter(user=request.user).first()
            if not manager or transfer.from_supplier_id != manager.supplier_id:
                return Response(
                    {"detail": "You can only reject dispatches for your supplier."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        before = snapshot_transfer(transfer)
        transfer.status = Transfer.REJECTED
        transfer.rejection_message = message
        transfer.rejected_at = timezone.now()
        transfer.rejected_by = request.user
        transfer.save(
            update_fields=["status", "rejection_message", "rejected_at", "rejected_by"]
        )
        changes = build_saved_field_changes(before, transfer)
        AuditLog.objects.create(
            action="transfer_rejected",
            user=request.user,
            transfer=transfer,
            details={
                "via": "api",
                "endpoint": request.path,
                "model": "transfer",
                "message": message,
                "changes": changes,
            },
        )
        notify_for_transfer_rejected(transfer, message, actor=request.user)
        return Response(TransferSerializer(transfer).data)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        transfer = self.get_object()
        before = snapshot_transfer(transfer)
        transfer.status = Transfer.RECEIVED
        if transfer.confirmed_at is None:
            transfer.confirmed_at = timezone.now()
            transfer.save(update_fields=["status", "confirmed_at"])
        else:
            transfer.save(update_fields=["status"])
        changes = build_saved_field_changes(before, transfer)
        AuditLog.objects.create(
            action="transfer_received",
            user=request.user,
            transfer=transfer,
            details={
                "via": "api",
                "endpoint": request.path,
                "model": "transfer",
                "changes": changes,
            },
        )
        notify_for_transfer_received(transfer, actor=request.user)
        return Response(TransferSerializer(transfer).data)

    @action(detail=True, methods=["post"])
    def send_otp(self, request, pk=None):
        transfer = self.get_object()
        if transfer.transfer_type != Transfer.BRANCH_TO_FARMER or not transfer.farmer:
            return Response(
                {"detail": "OTP verification only applies to farmer distributions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_resend = bool(request.data.get("resend"))
        delivery_method = (request.data.get("delivery_method") or "").strip().lower()
        logger.info(
            "send_otp API transfer_id=%s user=%s resend=%s delivery_method=%s",
            transfer.id,
            getattr(request.user, "username", None),
            is_resend,
            delivery_method or "(default)",
        )
        result = issue_distribution_otp(
            transfer,
            user=request.user,
            is_resend=is_resend,
            delivery_method=delivery_method,
        )
        if not result.get("otp_sent"):
            return Response(
                {
                    "detail": result.get("detail") or "OTP SMS could not be sent.",
                    "sms": result.get("sms"),
                    "otp_code_length": result.get("otp_code_length"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "otp": result.get("otp"),
                "sms": result.get("sms"),
                "otp_code_length": result.get("otp_code_length"),
            }
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

        clean_code = re.sub(r"\D", "", str(code or "").strip())
        if not clean_code:
            return Response(
                {"detail": "OTP code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verify_result = verify_farmer_otp(otp_record, clean_code)
        if not verify_result.get("verified"):
            otp_record.attempts += 1
            otp_record.status = OTPVerification.FAILED
            otp_record.save(update_fields=["status", "attempts"])
            detail = verify_result.get("error") or "Invalid OTP code."
            remaining = verify_result.get("remaining_attempts")
            if remaining is not None and remaining > 0:
                detail = f"{detail} ({remaining} attempt(s) remaining.)"
            elif verify_result.get("locked"):
                detail = f"{detail} Request a new code using Resend OTP."
            if verify_result.get("expired") or verify_result.get("locked"):
                otp_record.status = OTPVerification.EXPIRED
                otp_record.save(update_fields=["status"])
            return Response(
                {
                    "detail": detail,
                    "remaining_attempts": remaining,
                    "locked": bool(verify_result.get("locked")),
                },
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
        notify_for_otp_verified(transfer, anchor_summary=anchor_summary)

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
            cid = existing.payload.get("cid", "")
            storage_url = existing.payload.get("storage_url") or ""
            storage_is_remote = existing.payload.get("storage_is_remote", False)
            storage_url, storage_is_remote = normalize_receipt_access(
                transfer.id, cid, storage_url, storage_is_remote
            )
            if not (existing.payload or {}).get("receipt"):
                receipt_on_disk = load_receipt(transfer.id)
                if receipt_on_disk:
                    save_receipt_to_db(transfer.id, receipt_on_disk)
            storacha_ok = existing.payload.get("storacha_ok", False)
            if cid.startswith("local-"):
                storacha_ok = False
            elif storage_is_remote:
                storacha_ok = existing.payload.get("storacha_ok", True)
            return {
                "cid": cid,
                "tx_hash": existing.tx_hash,
                "data_hash": existing.data_hash,
                "network": existing.network,
                "storage_url": storage_url,
                "storage_is_remote": storage_is_remote,
                "storacha_ok": storacha_ok,
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

        payload_signature = build_payload_signature(
            batch_code=receipt["batch"].get("code") or "",
            quantity_bags=transfer.quantity_bags,
            content_cid=cid,
            transfer_id=transfer.id,
            verified_at=receipt["verified_at"],
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

        explorer_url = (
            f"https://amoy.polygonscan.com/tx/{tx_hash}" if tx_hash else None
        )
        receipt["data_hash"] = data_hash
        receipt["payload_signature"] = payload_signature
        receipt["content_cid"] = cid
        receipt["tx_hash"] = tx_hash
        receipt["network"] = "polygon-amoy"
        receipt["integrity"] = {
            "payload_signature": payload_signature,
            "data_hash": data_hash,
            "content_cid": cid,
            "tx_hash": tx_hash,
            "network": "polygon-amoy",
            "explorer_url": explorer_url,
        }
        try:
            local_url = save_receipt_local(f"transfer-{transfer.id}-receipt", receipt)
            if not storage_result.is_remote:
                anchor_payload["storage_url"] = local_url
        except Exception as exc:
            logger.warning(
                "Could not update local receipt with integrity metadata for transfer %s: %s",
                transfer.id,
                exc,
            )
        # Always keep a DB copy — survives Render redeploys even when disk/Storacha differ.
        save_receipt_to_db(transfer.id, receipt)

        return {
            "transfer_id": transfer.id,
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

    @action(detail=False, methods=["post"], url_path="notify-receiver")
    def notify_receiver(self, request):
        to_branch_id = request.data.get("to_branch_id")
        receiver_email = (request.data.get("receiver_email") or "").strip()
        receiver_name = (request.data.get("receiver_name") or "").strip()
        supplier_name = (request.data.get("supplier_name") or "CoffeeChain").strip()
        transfer_ids = request.data.get("transfer_ids") or []

        if not to_branch_id:
            raise ValidationError({"to_branch_id": "to_branch_id is required."})
        if not receiver_email:
            raise ValidationError({"receiver_email": "receiver_email is required."})
        if not receiver_name:
            raise ValidationError({"receiver_name": "receiver_name is required."})
        if not isinstance(transfer_ids, list) or not transfer_ids:
            raise ValidationError({"transfer_ids": "transfer_ids must be a non-empty list."})

        transfers = list(
            Transfer.objects.select_related("batch", "to_branch")
            .filter(id__in=transfer_ids)
            .order_by("id")
        )
        if not transfers:
            raise ValidationError({"transfer_ids": "No matching transfers were found."})

        table_rows = []
        for transfer in transfers:
            table_rows.append(
                {
                    "batch_code": transfer.batch.batch_code if transfer.batch else "",
                    "fertilizer_type": transfer.batch.fertilizer_type if transfer.batch else "",
                    "quantity_bags": transfer.quantity_bags,
                    "delivery_address": transfer.delivery_address or "",
                }
            )

        transfer_id_text = ", ".join(str(transfer.id) for transfer in transfers)
        subject = f"Fertilizer Dispatch from {supplier_name} — Transfer IDs: {transfer_id_text}"
        body_lines = [
            f"Supplier: {supplier_name}",
            f"Receiver: {receiver_name}",
            f"Transfer IDs: {transfer_id_text}",
            "",
            "Dispatch summary:",
        ]
        for row in table_rows:
            body_lines.append(
                f"- {row['batch_code']} | {row['fertilizer_type']} | {row['quantity_bags']} bags | {row['delivery_address'] or '—'}"
            )
        body_lines.extend(
            [
                "",
                "To confirm receipt of each delivery, log into CoffeeChain and use the Transfer ID(s) above in the Receive Batches section.",
            ]
        )

        email_sent = False
        try:
            send_mail(
                subject,
                "\n".join(body_lines),
                getattr(settings, "DEFAULT_FROM_EMAIL", None),
                [receiver_email],
                fail_silently=False,
            )
            email_sent = True
        except Exception:
            logger.exception("Failed to send dispatch notification email")

        in_app_sent = False
        branch = Branch.objects.select_related("user").filter(id=to_branch_id).first()
        if branch and branch.user:
            notification_body = (
                f"{sum(row['quantity_bags'] for row in table_rows)} bag(s) of fertilizer dispatched to your branch. "
                f"Transfer IDs: {transfer_id_text}. Tap to view and confirm receipt."
            )
            Notification.objects.create(
                user=branch.user,
                notification_type=Notification.TYPE_DISPATCH,
                title=f"New dispatch from {supplier_name}",
                message=notification_body,
                details=f"Transfer IDs: {transfer_id_text}",
                priority=Notification.PRIORITY_HIGH,
                transfer=transfers[0],
                metadata={
                    "transfer_ids": [transfer.id for transfer in transfers],
                    "tab": "receive",
                },
            )
            in_app_sent = True

        return Response({"email_sent": email_sent, "in_app_sent": in_app_sent})

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        transfer = self.get_object()
        if not user_can_view_transfer_receipt(request.user, transfer):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        receipt = load_receipt(transfer.id)
        anchor = BlockchainAnchor.objects.filter(transfer_id=transfer.id).first()
        if not receipt and anchor:
            payload = anchor.payload or {}
            receipt = {
                "transfer_id": transfer.id,
                "quantity_bags": transfer.quantity_bags,
                "batch": {
                    "code": transfer.batch.batch_code if transfer.batch else None,
                    "fertilizer_type": (
                        transfer.batch.fertilizer_type if transfer.batch else None
                    ),
                },
                "farmer": (
                    {
                        "ministry_id": transfer.farmer.ministry_id,
                        "name": transfer.farmer.name,
                    }
                    if transfer.farmer
                    else None
                ),
                "verified_at": anchor.anchored_at.isoformat() if anchor.anchored_at else None,
                "integrity": {
                    "data_hash": anchor.data_hash,
                    "tx_hash": anchor.tx_hash,
                    "network": anchor.network,
                    "explorer_url": (
                        f"https://amoy.polygonscan.com/tx/{anchor.tx_hash}"
                        if anchor.tx_hash
                        else None
                    ),
                },
                "receipt_summary": payload.get("receipt_summary"),
                "note": "Partial receipt rebuilt from blockchain anchor.",
            }

        if not receipt:
            return Response(
                {"detail": "Verification receipt not found for this transfer."},
                status=status.HTTP_404_NOT_FOUND,
            )

        storage_url = ""
        storage_is_remote = False
        cid = ""
        if anchor:
            cid = anchor.payload.get("cid", "")
            storage_url = anchor.payload.get("storage_url", "")
            storage_is_remote = anchor.payload.get("storage_is_remote", False)
            storage_url, storage_is_remote = normalize_receipt_access(
                transfer.id, cid, storage_url, storage_is_remote
            )

        return Response(
            {
                "transfer_id": transfer.id,
                "receipt": receipt,
                "storage": {
                    "cid": cid or receipt.get("content_cid"),
                    "url": storage_url,
                    "is_remote": storage_is_remote,
                },
            }
        )

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


class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issue.objects.select_related(
        "transfer",
        "transfer__batch",
        "transfer__from_supplier",
        "transfer__from_branch",
        "transfer__to_branch",
        "transfer__farmer",
        "reporter",
        "resolved_by",
    )
    serializer_class = IssueSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        role = resolve_role(user)

        if role == "admin":
            return queryset.order_by("-created_at")

        if role == "supplier":
            supplier = Supplier.objects.filter(user=user).first()
            if not supplier:
                return queryset.none()
            return (
                queryset.filter(
                    Q(transfer__from_supplier=supplier)
                    | Q(transfer__from_supplier__isnull=True, transfer__batch__supplier=supplier)
                )
                .distinct()
                .order_by("-created_at")
            )

        if role in {"retailer", "cooperative"}:
            return queryset.filter(reporter=user).order_by("-created_at")

        return queryset.none()

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create"]:
            return [IsAuthenticated()]
        if self.action in ["resolve", "partial_update", "update", "destroy"]:
            return [IsAuthenticated(), SupplierOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        issue = serializer.save(reporter=self.request.user)
        supplier = issue.transfer.from_supplier
        if supplier and supplier.user:
            Notification.objects.create(
                user=supplier.user,
                notification_type=Notification.TYPE_SYSTEM,
                title=f"New {issue.get_issue_type_display().lower()} reported",
                message=issue.summary,
                details=f"Transfer #{issue.transfer_id} • {issue.transfer.batch.batch_code if issue.transfer and issue.transfer.batch else 'Batch'}",
                priority=Notification.PRIORITY_HIGH,
                transfer=issue.transfer,
                metadata={
                    "issue_id": issue.id,
                    "issue_type": issue.issue_type,
                    "tab": "issues",
                },
            )

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        issue = self.get_object()
        resolution_notes = (request.data.get("resolution_notes") or "").strip()
        issue.status = Issue.RESOLVED
        issue.resolution_notes = resolution_notes or issue.resolution_notes
        issue.resolved_by = request.user
        issue.resolved_at = timezone.now()
        issue.save(update_fields=["status", "resolution_notes", "resolved_by", "resolved_at", "updated_at"])
        return Response(self.get_serializer(issue).data)


class OTPVerificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = OTPVerification.objects.all()
    serializer_class = OTPVerificationSerializer
    permission_classes = [IsAuthenticated]


class BlockchainAnchorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BlockchainAnchor.objects.all()
    serializer_class = BlockchainAnchorSerializer
    permission_classes = [IsAuthenticated]


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related(
            "transfer"
        )

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        updated = (
            self.get_queryset()
            .filter(read_at__isnull=True)
            .update(read_at=timezone.now())
        )
        return Response({"marked_read": updated})


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


class ReportsView(APIView):
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]

    def get(self, request):
        from django.db.models import Count, Sum
        params = request.query_params
        report_type = params.get("type", "transfers")
        date_from = params.get("from", "")
        date_to = params.get("to", "")
        region_filter = (params.get("region") or "").strip()
        role_filter = (params.get("role") or "").strip()
        export_csv = params.get("export") == "csv"

        transfers_qs = Transfer.objects.select_related(
            "batch", "from_supplier", "from_branch", "to_branch", "farmer"
        )
        if date_from:
            try:
                from datetime import datetime
                dt = datetime.strptime(date_from, "%Y-%m-%d")
                transfers_qs = transfers_qs.filter(created_at__date__gte=dt.date())
            except ValueError:
                pass
        if date_to:
            try:
                from datetime import datetime
                dt = datetime.strptime(date_to, "%Y-%m-%d")
                transfers_qs = transfers_qs.filter(created_at__date__lte=dt.date())
            except ValueError:
                pass
        if region_filter:
            transfers_qs = transfers_qs.filter(
                Q(from_supplier__region__icontains=region_filter) |
                Q(from_branch__region__icontains=region_filter) |
                Q(to_branch__region__icontains=region_filter)
            )

        # Role / entity filtering
        if role_filter == "supplier":
            transfers_qs = transfers_qs.filter(transfer_type=Transfer.SUPPLIER_TO_BRANCH)
        elif role_filter in {"retailer", "cooperative"}:
            branch_type = Branch.RETAILER if role_filter == "retailer" else Branch.COOPERATIVE
            transfers_qs = transfers_qs.filter(
                transfer_type=Transfer.BRANCH_TO_FARMER,
                from_branch__branch_type=branch_type,
            )
        elif role_filter == "warehouse_manager":
            transfers_qs = transfers_qs.filter(transfer_type=Transfer.SUPPLIER_TO_BRANCH)

        rows = []
        if report_type == "transfers" or report_type == "dispatches":
            for t in transfers_qs.order_by("-created_at")[:500]:
                rows.append({
                    "transfer_id": t.id,
                    "date": t.created_at.date().isoformat(),
                    "type": t.transfer_type,
                    "status": t.status,
                    "batch_code": t.batch.batch_code if t.batch else "",
                    "fertilizer_type": t.batch.fertilizer_type if t.batch else "",
                    "quantity_bags": t.quantity_bags,
                    "from": (
                        t.from_supplier.name if t.from_supplier else
                        (t.from_branch.name if t.from_branch else "")
                    ),
                    "to": t.to_branch.name if t.to_branch else (t.farmer.name if t.farmer else ""),
                    "region": (
                        t.from_supplier.region if t.from_supplier else
                        (t.from_branch.region if t.from_branch else "")
                    ),
                })
        elif report_type == "stock":
            warehouses = Warehouse.objects.prefetch_related("batches")
            for wh in warehouses:
                rows.append({
                    "warehouse": wh.name,
                    "section": wh.section,
                    "region": wh.region,
                    "capacity_bags": wh.capacity_bags,
                    "current_bags": wh.current_bags,
                    "utilisation_pct": round(wh.current_bags / wh.capacity_bags * 100, 1) if wh.capacity_bags else 0,
                })
        elif report_type == "users":
            users_qs = User.objects.prefetch_related("groups")
            if role_filter:
                group_name = group_name_for_role(role_filter)
                if group_name:
                    users_qs = users_qs.filter(groups__name=group_name)
            for u in users_qs.order_by("username"):
                role = resolve_role(u)
                supplier = Supplier.objects.filter(user=u).first()
                branch = Branch.objects.filter(user=u).first()
                rows.append({
                    "user_id": u.id,
                    "username": u.username,
                    "name": f"{u.first_name} {u.last_name}".strip(),
                    "email": u.email,
                    "role": role,
                    "is_active": u.is_active,
                    "entity_name": (supplier.name if supplier else branch.name if branch else ""),
                    "region": (supplier.region if supplier else branch.region if branch else ""),
                    "contact_phone": (supplier.contact_phone if supplier else branch.contact_phone if branch else ""),
                    "joined": u.date_joined.date().isoformat(),
                })

        summary = {
            "total_rows": len(rows),
            "type": report_type,
            "date_from": date_from,
            "date_to": date_to,
            "role_filter": role_filter,
            "region_filter": region_filter,
        }

        if export_csv:
            import csv, io
            output = io.StringIO()
            if rows:
                writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)
            from django.http import HttpResponse
            response = HttpResponse(output.getvalue(), content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="coffeechain-report-{report_type}.csv"'
            return response

        return Response({"summary": summary, "rows": rows})


class IntegrityCheckView(APIView):
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        branch_type = (request.query_params.get("branch_type") or "").strip().upper()
        search = (request.query_params.get("search") or request.query_params.get("q") or "").strip()
        transfer_id = request.query_params.get("transfer_id")

        parsed_branch_id = int(branch_id) if branch_id and str(branch_id).isdigit() else None
        parsed_transfer_id = (
            int(transfer_id) if transfer_id and str(transfer_id).isdigit() else None
        )

        if not parsed_branch_id and not search and not parsed_transfer_id:
            return Response(
                {
                    "summary": {"total": 0},
                    "results": [],
                    "message": "Select a retailer or AMCOS, or search by name, batch, or transfer ID.",
                }
            )

        results = list_verified_transfers(
            branch_id=parsed_branch_id,
            branch_type=branch_type or None,
            search=search or None,
            transfer_id=parsed_transfer_id,
        )
        return Response(
            {
                "summary": {"total": len(results)},
                "results": results,
            }
        )


class IntegrityTransferView(APIView):
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]

    def get(self, request, transfer_id):
        transfer = (
            Transfer.objects.select_related(
                "batch", "farmer", "from_branch", "blockchain_anchor"
            )
            .filter(pk=transfer_id)
            .first()
        )
        if not transfer:
            return Response({"detail": "Transfer not found."}, status=status.HTTP_404_NOT_FOUND)
        result = verify_transfer_integrity(transfer, check_chain=False)
        return Response(result.to_dict())

    def post(self, request, transfer_id):
        notify = request.data.get("notify", True)
        transfer = (
            Transfer.objects.select_related(
                "batch", "farmer", "from_branch", "blockchain_anchor"
            )
            .filter(pk=transfer_id)
            .first()
        )
        if not transfer:
            return Response({"detail": "Transfer not found."}, status=status.HTTP_404_NOT_FOUND)

        result = verify_transfer_integrity(transfer, check_chain=False)
        payload = result.to_dict()
        payload["notified"] = False
        payload["restored"] = False
        if notify:
            if result.status == "mismatch":
                payload["notified"] = notify_for_integrity_mismatch(result)
            elif result.status == "ok":
                payload["restored"] = notify_for_integrity_restored(result)
        return Response(payload)


class IntegrityScanView(APIView):
    permission_classes = [IsAuthenticated, RegulatorOrAdmin]

    def post(self, request):
        notify = request.data.get("notify", True)
        branch_id = request.data.get("branch_id")
        branch_type = (request.data.get("branch_type") or "").strip().upper()
        search = (request.data.get("search") or "").strip()
        transfer_ids = request.data.get("transfer_ids") or []

        if transfer_ids:
            ids = [int(item) for item in transfer_ids if str(item).isdigit()]
            results = compare_transfers(ids, check_chain=False)
        else:
            listed = list_verified_transfers(
                branch_id=int(branch_id) if branch_id and str(branch_id).isdigit() else None,
                branch_type=branch_type or None,
                search=search or None,
            )
            ids = [item["transfer_id"] for item in listed]
            results = compare_transfers(ids, check_chain=False)

        mismatches = [item for item in results if item.status == "mismatch"]
        alerts_sent = 0
        restored_sent = 0
        if notify:
            for item in mismatches:
                if notify_for_integrity_mismatch(item):
                    alerts_sent += 1
            for item in results:
                if item.status == "ok":
                    if notify_for_integrity_restored(item):
                        restored_sent += 1

        return Response(
            {
                "summary": {
                    "total": len(results),
                    "ok": sum(1 for item in results if item.status == "ok"),
                    "mismatch": len(mismatches),
                    "alerts_sent": alerts_sent,
                    "restored_sent": restored_sent,
                },
                "results": [item.to_dict() for item in results],
            }
        )


# ──────────────────────────────────────────────────────────────────────────────
# Orders  (Retailer / AMCOS → Supplier, with Warehouse Manager involvement)
# ──────────────────────────────────────────────────────────────────────────────

def _notify_order_event(order, event: str):
    """Create in-app notifications for key order lifecycle events."""
    branch_user = order.branch.user if order.branch else None
    supplier_user = order.supplier.user if order.supplier else None
    wm_users = list(
        User.objects.filter(warehouse_manager_profile__supplier=order.supplier).distinct()
    )

    branch_name = order.branch.name if order.branch else "Branch"
    supplier_name = order.supplier.name if order.supplier else "Supplier"
    ftype = order.fertilizer_type
    qty = order.quantity_bags

    def _n(user, title, message, priority=Notification.PRIORITY_MEDIUM, meta=None):
        if not user:
            return
        Notification.objects.create(
            user=user,
            notification_type=Notification.TYPE_STOCK,
            title=title,
            message=message,
            priority=priority,
            metadata=meta or {},
        )

    if event == "placed":
        _n(
            supplier_user,
            f"New order from {branch_name}",
            f"{branch_name} ordered {qty} bags of {ftype}.",
            priority=Notification.PRIORITY_HIGH,
            meta={"tab": "orders"},
        )
        for wm in wm_users:
            _n(
                wm,
                f"New order for {supplier_name}",
                f"{branch_name} requested {qty} bags of {ftype}. Awaiting supplier review.",
                priority=Notification.PRIORITY_MEDIUM,
                meta={"tab": "orders"},
            )

    elif event == "accepted":
        _n(
            branch_user,
            f"Order accepted by {supplier_name}",
            f"Your order for {qty} bags of {ftype} has been accepted.",
            priority=Notification.PRIORITY_HIGH,
            meta={"tab": "orders"},
        )
        for wm in wm_users:
            _n(
                wm,
                f"Order to process – {branch_name}",
                f"Supplier accepted {qty} bags of {ftype} for {branch_name}. Prepare dispatch.",
                priority=Notification.PRIORITY_HIGH,
                meta={"tab": "orders"},
            )

    elif event == "rejected":
        _n(
            branch_user,
            f"Order rejected by {supplier_name}",
            f"Your order for {qty} bags of {ftype} was not accepted. Reason: {order.rejected_reason or 'N/A'}",
            priority=Notification.PRIORITY_HIGH,
            meta={"tab": "orders"},
        )

    elif event == "ready":
        _n(
            branch_user,
            "Order on the way — confirm delivery",
            f"{qty} bags of {ftype} have been verified by the warehouse and are en route to you.",
            priority=Notification.PRIORITY_HIGH,
            meta={"tab": "orders"},
        )

    elif event == "dispatched":
        _n(
            branch_user,
            "Order dispatched from warehouse",
            f"{qty} bags of {ftype} from {supplier_name} have been dispatched — awaiting warehouse verification.",
            priority=Notification.PRIORITY_MEDIUM,
            meta={"tab": "orders"},
        )
        for wm in wm_users:
            _n(
                wm,
                f"Verify dispatch – Order #{order.id}",
                f"{supplier_name} dispatched {qty} bags of {ftype} to {branch_name}. Please verify.",
                priority=Notification.PRIORITY_HIGH,
                meta={"tab": "orders"},
            )

    elif event == "delivered":
        _n(
            supplier_user,
            f"Order delivered to {branch_name}",
            f"{branch_name} confirmed receipt of {qty} bags of {ftype}.",
            priority=Notification.PRIORITY_MEDIUM,
            meta={"tab": "orders"},
        )
        for wm in wm_users:
            _n(
                wm,
                f"Order delivered – {branch_name}",
                f"{branch_name} confirmed receipt of {qty} bags of {ftype}.",
                priority=Notification.PRIORITY_LOW,
                meta={"tab": "orders"},
            )

    elif event == "cancelled":
        _n(
            supplier_user,
            f"Order cancelled by {branch_name}",
            f"{branch_name} cancelled their order for {qty} bags of {ftype}.",
            priority=Notification.PRIORITY_MEDIUM,
            meta={"tab": "orders"},
        )


class OrderViewSet(viewsets.ModelViewSet):
    """CRUD + lifecycle actions for fertilizer orders (Retailer / AMCOS → Supplier)."""

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = resolve_role(user)
        qs = Order.objects.select_related(
            "branch", "supplier", "preferred_batch", "linked_transfer"
        )

        if role == "admin":
            return qs.all()
        if role in ("retailer", "cooperative"):
            branch = Branch.objects.filter(user=user).first()
            return qs.filter(branch=branch) if branch else qs.none()
        if role == "supplier":
            supplier = Supplier.objects.filter(user=user).first()
            return qs.filter(supplier=supplier) if supplier else qs.none()
        if role == "warehouse_manager":
            wm = WarehouseManager.objects.filter(user=user).first()
            if not wm:
                return qs.none()
            return qs.filter(supplier=wm.supplier)
        if role == "regulator":
            return qs.all()
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        branch = Branch.objects.filter(user=user).first()
        if not branch:
            raise ValidationError("Only retailers or cooperatives can place orders.")
        order = serializer.save(branch=branch, created_by=user, status=Order.PENDING)
        _notify_order_event(order, "placed")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, SupplierOrAdmin | WarehouseManagerOrAdmin])
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.status != Order.PENDING:
            return Response(
                {"detail": "Only pending orders can be accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.ACCEPTED
        order.supplier_notes = request.data.get("supplier_notes", "")
        order.save()
        _notify_order_event(order, "accepted")
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, SupplierOrAdmin])
    def reject(self, request, pk=None):
        order = self.get_object()
        if order.status not in (Order.PENDING, Order.ACCEPTED):
            return Response(
                {"detail": "Order cannot be rejected at this stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.REJECTED
        order.rejected_reason = request.data.get("reason", "")
        order.supplier_notes = request.data.get("supplier_notes", "")
        order.save()
        _notify_order_event(order, "rejected")
        return Response(OrderSerializer(order).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin],
    )
    def mark_processing(self, request, pk=None):
        order = self.get_object()
        if order.status != Order.ACCEPTED:
            return Response(
                {"detail": "Order must be accepted before marking as processing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.PROCESSING
        order.save()
        return Response(OrderSerializer(order).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin],
    )
    def mark_ready(self, request, pk=None):
        order = self.get_object()
        if order.status not in (Order.ACCEPTED, Order.PROCESSING):
            return Response(
                {"detail": "Order must be accepted or processing to mark as ready."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.READY
        order.save()
        _notify_order_event(order, "ready")
        return Response(OrderSerializer(order).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin],
    )
    def link_transfer(self, request, pk=None):
        """Attach an existing Transfer to this order (marks order as DISPATCHED)."""
        order = self.get_object()
        transfer_id = request.data.get("transfer_id")
        if not transfer_id:
            return Response({"detail": "transfer_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        transfer = get_object_or_404(Transfer, pk=transfer_id)
        order.linked_transfer = transfer
        order.status = Order.DISPATCHED
        order.save()
        _notify_order_event(order, "dispatched")
        return Response(OrderSerializer(order).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="send_dispatch",
        permission_classes=[IsAuthenticated, SupplierOrAdmin],
    )
    def send_dispatch(self, request, pk=None):
        """Supplier dispatches an order from a warehouse batch.
        Requires batch_id. Deducts stock and auto-creates a Transfer."""
        order = self.get_object()
        if order.status not in (Order.PENDING, Order.ACCEPTED):
            return Response(
                {"detail": "Only pending or accepted orders can be dispatched."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response(
                {"detail": "batch_id is required to dispatch from warehouse stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        batch = get_object_or_404(FertilizerBatch, pk=batch_id)

        # Verify the batch belongs to this supplier
        supplier = _get_supplier_for_user(request.user)
        if not supplier:
            return Response({"detail": "Supplier profile not found."}, status=status.HTTP_403_FORBIDDEN)

        if batch.supplier != supplier:
            return Response({"detail": "Batch does not belong to your inventory."}, status=status.HTTP_403_FORBIDDEN)

        # Check available stock
        available = get_batch_available_quantity(batch)
        if available < order.quantity_bags:
            return Response(
                {"detail": f"Insufficient stock. Available: {available} bags, needed: {order.quantity_bags} bags."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Auto-create a Transfer record
        transfer = Transfer.objects.create(
            batch=batch,
            transfer_type=Transfer.SUPPLIER_TO_BRANCH,
            from_supplier=supplier,
            to_branch=order.branch,
            quantity_bags=order.quantity_bags,
            delivery_address=order.delivery_address,
            status=Transfer.DISPATCHED,
        )

        order.linked_transfer = transfer
        order.status = Order.DISPATCHED
        order.save()
        _notify_order_event(order, "dispatched")
        return Response(OrderSerializer(order).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="verify_dispatch",
        permission_classes=[IsAuthenticated, WarehouseManagerOrAdmin],
    )
    def verify_dispatch(self, request, pk=None):
        """Warehouse manager verifies a dispatched order — marks it READY for delivery."""
        order = self.get_object()
        if order.status != Order.DISPATCHED:
            return Response(
                {"detail": "Only dispatched orders can be verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.READY
        order.save()
        _notify_order_event(order, "ready")
        return Response(OrderSerializer(order).data)

    @action(
        detail=False,
        methods=["get"],
        url_path="available_batches",
        permission_classes=[IsAuthenticated, SupplierOrAdmin],
    )
    def available_batches(self, request):
        """Return supplier's warehouse batches for a fertilizer type with available stock."""
        fertilizer_type = request.query_params.get("fertilizer_type", "").strip()
        supplier = _get_supplier_for_user(request.user)
        if not supplier:
            return Response({"detail": "Supplier profile not found."}, status=status.HTTP_403_FORBIDDEN)

        qs = FertilizerBatch.objects.filter(
            supplier=supplier,
            lifecycle_state__in=["IN_STORAGE", "RECEIVED", "MANUFACTURED"],
        )
        if fertilizer_type:
            qs = qs.filter(fertilizer_type__icontains=fertilizer_type)

        results = []
        for batch in qs.order_by("-quantity_bags"):
            available = get_batch_available_quantity(batch)
            results.append({
                "id": batch.id,
                "batch_code": batch.batch_code,
                "fertilizer_type": batch.fertilizer_type,
                "total_bags": batch.quantity_bags,
                "available_bags": available,
                "unit_weight_kg": float(batch.unit_weight_kg),
                "storage_location_id": batch.storage_location_id,
            })
        return Response(results)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, BranchStaffOrAdmin])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in (Order.PENDING, Order.ACCEPTED):
            return Response(
                {"detail": "Only pending or accepted orders can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.CANCELLED
        order.save()
        _notify_order_event(order, "cancelled")
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_delivered(self, request, pk=None):
        order = self.get_object()
        if order.status != Order.READY:
            return Response(
                {"detail": "Order must be verified by the warehouse before confirming delivery."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = Order.DELIVERED
        order.save()
        _notify_order_event(order, "delivered")
        return Response(OrderSerializer(order).data)


class SupplierCatalogView(APIView):
    """
    Authenticated supplier catalog for Retailers and AMCOS.
    Returns registered suppliers with their available fertilizer types and
    in-stock certified batch summaries so buyers know what to order from whom.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        supplier_id = request.query_params.get("supplier_id")
        fertilizer_type = request.query_params.get("fertilizer_type", "").strip()
        region = request.query_params.get("region", "").strip()

        suppliers = Supplier.objects.all()
        if supplier_id:
            suppliers = suppliers.filter(pk=supplier_id)
        if region:
            suppliers = suppliers.filter(region__icontains=region)

        catalog = []
        for supplier in suppliers:
            batch_qs = FertilizerBatch.objects.filter(
                supplier=supplier,
                lifecycle_state__in=["IN_STORAGE", "RECEIVED", "MANUFACTURED"],
            )
            if fertilizer_type:
                batch_qs = batch_qs.filter(fertilizer_type__icontains=fertilizer_type)

            available_batches = []
            for batch in batch_qs:
                avail = get_batch_available_quantity(batch)
                if avail > 0:
                    available_batches.append(
                        {
                            "id": batch.id,
                            "batch_code": batch.batch_code,
                            "fertilizer_type": batch.fertilizer_type,
                            "available_bags": avail,
                            "unit_weight_kg": float(batch.unit_weight_kg),
                            "expiry_date": batch.expiry_date,
                            "certification_status": batch.certification_status,
                        }
                    )

            type_summary = {}
            for b in available_batches:
                ft = b["fertilizer_type"]
                type_summary[ft] = type_summary.get(ft, 0) + b["available_bags"]

            catalog.append(
                {
                    "supplier_id": supplier.id,
                    "supplier_name": supplier.name,
                    "region": supplier.region,
                    "contact_phone": supplier.contact_phone,
                    "store_image_url": (
                        request.build_absolute_uri(supplier.store_image.url)
                        if supplier.store_image
                        else None
                    ),
                    "available_fertilizer_types": [
                        {"fertilizer_type": ft, "total_available_bags": bags}
                        for ft, bags in sorted(type_summary.items())
                    ],
                    "available_batches": available_batches,
                }
            )

        return Response({"results": catalog, "count": len(catalog)})