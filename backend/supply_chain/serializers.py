from django.contrib.auth.models import User
from rest_framework import serializers

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
    OTPVerification,
    PendingRegistration,
    Supplier,
    Transfer,
    Warehouse,
    WarehouseManager,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_active"]


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=[
            "admin",
            "supplier",
            "warehouse_manager",
            "retailer",
            "cooperative",
            "regulator",
        ]
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    supplier_name = serializers.CharField(required=False, allow_blank=True)
    supplier_region = serializers.CharField(required=False, allow_blank=True)
    supplier_id = serializers.IntegerField(required=False)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    branch_name = serializers.CharField(required=False, allow_blank=True)
    branch_type = serializers.ChoiceField(
        choices=["RETAILER", "COOPERATIVE", "REGULATOR"], required=False
    )
    district = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)
    warehouse_id = serializers.IntegerField(required=False)


class AdminUserUpdateSerializer(serializers.Serializer):
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    supplier_name = serializers.CharField(required=False, allow_blank=True)
    supplier_region = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    branch_name = serializers.CharField(required=False, allow_blank=True)
    branch_type = serializers.ChoiceField(
        choices=["RETAILER", "COOPERATIVE", "REGULATOR"], required=False
    )
    district = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)
    warehouse_id = serializers.IntegerField(required=False, allow_null=True)


class SupplierSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    store_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            "id", "name", "region", "contact_phone",
            "store_image", "store_image_url",
            "location_lat", "location_lng",
            "user", "created_at",
        ]
        extra_kwargs = {"store_image": {"write_only": True, "required": False}}

    def get_store_image_url(self, obj):
        request = self.context.get("request")
        if not obj.store_image:
            return None
        url = obj.store_image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class WarehouseManagerSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    assigned_warehouse_id = serializers.SerializerMethodField()
    assigned_warehouse_name = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseManager
        fields = ["id", "supplier", "user", "created_at", "assigned_warehouse_id", "assigned_warehouse_name"]

    def get_assigned_warehouse_id(self, obj):
        w = getattr(obj, "assigned_warehouse", None)
        return w.id if w else None

    def get_assigned_warehouse_name(self, obj):
        w = getattr(obj, "assigned_warehouse", None)
        return w.name if w else None


class BranchSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    farmers_count = serializers.IntegerField(source="farmers.count", read_only=True)
    shop_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "branch_type",
            "district",
            "region",
            "contact_phone",
            "shop_image",
            "shop_image_url",
            "location_lat",
            "location_lng",
            "user",
            "created_at",
            "farmers_count",
        ]
        extra_kwargs = {"shop_image": {"write_only": True, "required": False}}

    def get_shop_image_url(self, obj):
        request = self.context.get("request")
        if not obj.shop_image:
            return None
        url = obj.shop_image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class PendingRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingRegistration
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "organisation_name", "contact_phone", "region", "district",
            "status", "rejection_reason", "created_at", "reviewed_at",
        ]
        read_only_fields = ["status", "rejection_reason", "created_at", "reviewed_at"]


class PublicRegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["supplier", "retailer", "cooperative"])
    organisation_name = serializers.CharField()
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)
    district = serializers.CharField(required=False, allow_blank=True)


class FarmerSerializer(serializers.ModelSerializer):
    cooperative = BranchSerializer(read_only=True)
    cooperative_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source="cooperative", write_only=True, required=False
    )

    class Meta:
        model = Farmer
        fields = [
            "id",
            "name",
            "ministry_id",
            "phone_number",
            "district",
            "cooperative",
            "cooperative_id",
            "created_at",
        ]

    def to_representation(self, instance):
        from .services.ministry_of_agriculture import refresh_farmer_from_registry

        instance = refresh_farmer_from_registry(instance)
        return super().to_representation(instance)


class WarehouseSerializer(serializers.ModelSerializer):
    assigned_manager_id = serializers.PrimaryKeyRelatedField(
        queryset=WarehouseManager.objects.all(),
        source="assigned_manager",
        write_only=True,
        required=False,
        allow_null=True,
    )
    assigned_manager = WarehouseManagerSerializer(read_only=True)

    class Meta:
        model = Warehouse
        fields = [
            "id",
            "name",
            "section",
            "address",
            "region",
            "contact_name",
            "contact_phone",
            "notes",
            "capacity_bags",
            "current_bags",
            "assigned_manager",
            "assigned_manager_id",
            "created_at",
        ]


class FertilizerBatchSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), source="supplier", write_only=True
    )

    storage_location = WarehouseSerializer(read_only=True)
    storage_location_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('supply_chain.models', fromlist=['Warehouse']).Warehouse.objects.all(),
        source='storage_location',
        write_only=True,
        required=False,
    )

    class Meta:
        model = FertilizerBatch
        fields = [
            "id",
            "supplier",
            "supplier_id",
            "batch_code",
            "fertilizer_type",
            "quantity_bags",
            "unit_weight_kg",
            "quantity_tons",
            "manufacturer",
            "production_date",
            "expiry_date",
            "date_received",
            "source_reference",
            "certification_status",
            "storage_location",
            "storage_location_id",
            "lifecycle_state",
            "notes",
            "created_at",
        ]


class TransferSerializer(serializers.ModelSerializer):
    batch = FertilizerBatchSerializer(read_only=True)
    batch_id = serializers.PrimaryKeyRelatedField(
        queryset=FertilizerBatch.objects.all(), source="batch", write_only=True
    )
    warehouse = WarehouseSerializer(read_only=True)
    warehouse_id = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(), source="warehouse", write_only=True, required=False
    )
    from_supplier = SupplierSerializer(read_only=True)
    from_supplier_id = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(),
        source="from_supplier",
        write_only=True,
        required=False,
    )
    from_branch = BranchSerializer(read_only=True)
    from_branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source="from_branch", write_only=True, required=False
    )
    to_branch = BranchSerializer(read_only=True)
    to_branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source="to_branch", write_only=True, required=False
    )
    farmer = FarmerSerializer(read_only=True)
    farmer_id = serializers.PrimaryKeyRelatedField(
        queryset=Farmer.objects.all(), source="farmer", write_only=True, required=False
    )

    class Meta:
        model = Transfer
        fields = [
            "id",
            "batch",
            "batch_id",
            "delivery_address",
            "receiver_name",
            "receiver_email",
            "receiver_phone",
            "receiver_organisation",
            "warehouse",
            "warehouse_id",
            "transfer_type",
            "from_supplier",
            "from_supplier_id",
            "from_branch",
            "from_branch_id",
            "to_branch",
            "to_branch_id",
            "farmer",
            "farmer_id",
            "quantity_bags",
            "status",
            "confirmed_at",
            "buyer_type",
            "ministry_verified",
            "discount_percent",
            "notes",
            "rejection_message",
            "rejected_at",
            "created_at",
        ]
        extra_kwargs = {
            "buyer_type": {"required": False},
            "ministry_verified": {"required": False},
            "discount_percent": {"required": False},
        }

    def validate_discount_percent(self, value):
        if value is None:
            return value
        if value < 0 or value > 100:
            raise serializers.ValidationError("Discount must be between 0 and 100.")
        return value


class DeliveryProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryProof
        fields = [
            "id",
            "transfer",
            "file",
            "cid",
            "gps_lat",
            "gps_lng",
            "meta",
            "uploaded_by",
            "uploaded_at",
        ]
        read_only_fields = ["cid", "uploaded_by", "uploaded_at"]


class IssueSerializer(serializers.ModelSerializer):
    transfer = TransferSerializer(read_only=True)
    transfer_id = serializers.PrimaryKeyRelatedField(
        queryset=Transfer.objects.all(), source="transfer", write_only=True
    )
    reporter = UserSerializer(read_only=True)
    resolved_by = UserSerializer(read_only=True)
    evidence_file_url = serializers.SerializerMethodField()
    reporter_role = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            "id",
            "transfer",
            "transfer_id",
            "issue_type",
            "summary",
            "description",
            "evidence_file",
            "evidence_file_url",
            "status",
            "resolution_notes",
            "reporter",
            "reporter_role",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "reporter",
            "reporter_role",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
            "evidence_file_url",
        ]

    def get_evidence_file_url(self, obj):
        request = self.context.get("request")
        if not obj.evidence_file:
            return None
        url = obj.evidence_file.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_reporter_role(self, obj):
        if not obj.reporter:
            return None
        if obj.reporter.is_staff:
            return "admin"
        group_names = set(obj.reporter.groups.values_list("name", flat=True))
        for role in ("Supplier", "Retailer", "Cooperative", "Regulator"):
            if role in group_names:
                return role.lower()
        return "user"


class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = [
            "transfer",
            "phone_number",
            "status",
            "sent_at",
            "verified_at",
            "attempts",
        ]


class BlockchainAnchorSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockchainAnchor
        fields = ["transfer", "data_hash", "tx_hash", "network", "anchored_at", "payload"]


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "details",
            "priority",
            "read_at",
            "is_read",
            "transfer_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

    def get_is_read(self, obj):
        return obj.read_at is not None


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "action", "user", "transfer", "details", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    branch_type = serializers.CharField(source="branch.branch_type", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    preferred_batch_code = serializers.CharField(
        source="preferred_batch.batch_code", read_only=True
    )
    linked_transfer_id = serializers.IntegerField(source="linked_transfer.id", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    order_type_display = serializers.CharField(source="get_order_type_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "branch",
            "branch_name",
            "branch_type",
            "supplier",
            "supplier_name",
            "order_type",
            "order_type_display",
            "fertilizer_type",
            "quantity_bags",
            "unit_weight_kg",
            "preferred_batch",
            "preferred_batch_code",
            "custom_specifications",
            "delivery_address",
            "required_by_date",
            "status",
            "status_display",
            "supplier_notes",
            "rejected_reason",
            "linked_transfer_id",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "branch",
            "preferred_batch",
            "status",
            "supplier_notes",
            "rejected_reason",
            "linked_transfer_id",
            "created_at",
            "updated_at",
        ]
