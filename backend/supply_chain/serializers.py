from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    AuditLog,
    BlockchainAnchor,
    Branch,
    DeliveryProof,
    Farmer,
    FertilizerBatch,
    OTPVerification,
    Supplier,
    Transfer,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["admin", "supplier", "retailer", "cooperative", "regulator"]
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    supplier_name = serializers.CharField(required=False, allow_blank=True)
    supplier_region = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    branch_name = serializers.CharField(required=False, allow_blank=True)
    branch_type = serializers.ChoiceField(
        choices=["RETAILER", "COOPERATIVE", "REGULATOR"], required=False
    )
    district = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)


class SupplierSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Supplier
        fields = ["id", "name", "region", "contact_phone", "user", "created_at"]


class BranchSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    farmers_count = serializers.IntegerField(source="farmers.count", read_only=True)

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "branch_type",
            "district",
            "region",
            "user",
            "created_at",
            "farmers_count",
        ]


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


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('supply_chain.models', fromlist=['Warehouse']).Warehouse
        fields = ['id', 'name', 'section', 'capacity_bags', 'current_bags', 'created_at']


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
            "notes",
            "created_at",
        ]


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


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "action", "user", "transfer", "details", "created_at"]
