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
    Warehouse,
    OTPVerification,
    Supplier,
    Transfer,
)
from .permissions import (
    BranchStaffOrAdmin,
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
    AdminUserUpdateSerializer,
    AuditLogSerializer,
    BlockchainAnchorSerializer,
    BranchSerializer,
    DeliveryProofSerializer,
    FarmerSerializer,
    FertilizerBatchSerializer,
    IssueSerializer,
    NotificationSerializer,
    WarehouseSerializer,
    OTPVerificationSerializer,
    SupplierSerializer,
    TransferSerializer,
    UserSerializer,
)
from .services.blockchain import anchor_to_polygon, build_hash, build_payload_signature
from .services.ipfs import normalize_receipt_access, save_receipt_local, store_file, store_json
from .services.integrity import (
    compare_transfers,
    list_verified_transfers,
    verify_transfer_integrity,
)
from .services.ministry_of_agriculture import fetch_farmer
from .services.notifications import (
    notify_for_farmer_registered,
    notify_for_integrity_mismatch,
    notify_for_otp_sent,
    notify_for_otp_verified,
    notify_for_transfer_created,
    notify_for_transfer_received,
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


def get_batch_available_quantity(batch):
    dispatched_total = (
        batch.transfers.filter(transfer_type=Transfer.SUPPLIER_TO_BRANCH).aggregate(
            total=Sum("quantity_bags")
        )["total"]
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

    def retrieve(self, request, pk=None):
        user = get_object_or_404(User, pk=pk)
        return Response(build_user_payload(user))

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk)

    def update(self, request, pk=None):
        return self._update_user(request, pk)

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
                    branch.save()

        return Response(build_user_payload(user))


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

            transfer = serializer.save(created_by=self.request.user, warehouse=warehouse)

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
        if notify and result.status == "mismatch":
            payload["notified"] = notify_for_integrity_mismatch(result)
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
        if notify:
            for item in mismatches:
                if notify_for_integrity_mismatch(item):
                    alerts_sent += 1

        return Response(
            {
                "summary": {
                    "total": len(results),
                    "ok": sum(1 for item in results if item.status == "ok"),
                    "mismatch": len(mismatches),
                    "alerts_sent": alerts_sent,
                },
                "results": [item.to_dict() for item in results],
            }
        )