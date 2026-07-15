from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Supplier(models.Model):
    name = models.CharField(max_length=200)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    region = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    store_image = models.ImageField(upload_to="supplier_images/", blank=True, null=True)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class WarehouseManager(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="warehouse_manager_profile",
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="warehouse_managers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} @ {self.supplier.name}"


class Branch(models.Model):
    RETAILER = "RETAILER"
    COOPERATIVE = "COOPERATIVE"
    REGULATOR = "REGULATOR"
    BRANCH_TYPES = [
        (RETAILER, "Retailer"),
        (COOPERATIVE, "Cooperative"),
        (REGULATOR, "Regulatory Authority"),
    ]

    name = models.CharField(max_length=200)
    branch_type = models.CharField(max_length=20, choices=BRANCH_TYPES)
    district = models.CharField(max_length=120, blank=True)
    region = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    shop_image = models.ImageField(upload_to="branch_images/", blank=True, null=True)
    location_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.branch_type})"


class PendingRegistration(models.Model):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
    ]

    ROLE_CHOICES = [
        ("supplier", "Supplier"),
        ("retailer", "Retailer"),
        ("cooperative", "Cooperative"),
    ]

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(blank=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    password_hash = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    # Role-specific details
    organisation_name = models.CharField(max_length=200, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    region = models.CharField(max_length=120, blank=True)
    district = models.CharField(max_length=120, blank=True)
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_registrations",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_registration",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role}) — {self.status}"


class Farmer(models.Model):
    name = models.CharField(max_length=200)
    ministry_id = models.CharField(max_length=40, unique=True)
    phone_number = models.CharField(max_length=30)
    district = models.CharField(max_length=120, blank=True)
    cooperative = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="farmers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.ministry_id})"


class FertilizerBatch(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="batches")
    batch_code = models.CharField(max_length=40, unique=True)
    fertilizer_type = models.CharField(max_length=120)
    quantity_bags = models.PositiveIntegerField()
    unit_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=50)
    # Extended metadata fields
    manufacturer = models.CharField(max_length=200, blank=True)
    production_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    date_received = models.DateField(null=True, blank=True)
    source_reference = models.CharField(max_length=255, blank=True, default="")
    CERT_STATUS = [
        ("Pending", "Pending"),
        ("Certified", "Certified"),
        ("Rejected", "Rejected"),
    ]
    certification_status = models.CharField(max_length=20, choices=CERT_STATUS, default="Pending")
    # Warehouse relation (optional)
    storage_location = models.ForeignKey(
        'Warehouse', on_delete=models.SET_NULL, null=True, blank=True, related_name='batches'
    )
    # Lifecycle state
    LIFECYCLE_STATES = [
        ("MANUFACTURED", "Manufactured"),
        ("RECEIVED", "Received"),
        ("IN_STORAGE", "In Storage"),
        ("DISPATCHED", "Dispatched"),
        ("DELIVERED", "Delivered"),
        ("VERIFIED", "Verified"),
        ("RETURNED", "Returned"),
        ("EXPIRED", "Expired"),
    ]
    lifecycle_state = models.CharField(max_length=20, choices=LIFECYCLE_STATES, default="IN_STORAGE")
    # optional derived field for tons
    quantity_tons = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.batch_code

    def save(self, *args, **kwargs):
        # compute approximate tons from bags and unit weight if not provided
        try:
            if self.quantity_bags is not None and (self.quantity_tons is None or self.quantity_tons == 0):
                self.quantity_tons = (self.quantity_bags * float(self.unit_weight_kg)) / 1000.0
        except Exception:
            pass
        super().save(*args, **kwargs)


class Warehouse(models.Model):
    name = models.CharField(max_length=200)
    section = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    region = models.CharField(max_length=100, blank=True, default="")
    contact_name = models.CharField(max_length=150, blank=True, default="")
    contact_phone = models.CharField(max_length=50, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    capacity_bags = models.PositiveIntegerField(default=0)
    current_bags = models.PositiveIntegerField(default=0)
    assigned_manager = models.OneToOneField(
        "WarehouseManager",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_warehouse",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.section})"


class Transfer(models.Model):
    SUPPLIER_TO_BRANCH = "SUPPLIER_TO_BRANCH"
    BRANCH_TO_FARMER = "BRANCH_TO_FARMER"
    TRANSFER_TYPES = [
        (SUPPLIER_TO_BRANCH, "Supplier to Branch"),
        (BRANCH_TO_FARMER, "Branch to Farmer"),
    ]

    PENDING = "PENDING"
    DISPATCHED = "DISPATCHED"
    RECEIVED = "RECEIVED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    STATUS_CHOICES = [
        (PENDING, "Pending Approval"),
        (DISPATCHED, "Dispatched"),
        (RECEIVED, "Received"),
        (VERIFIED, "Verified"),
        (REJECTED, "Rejected"),
    ]

    batch = models.ForeignKey(
        FertilizerBatch, on_delete=models.CASCADE, related_name="transfers"
    )
    delivery_address = models.CharField(max_length=255, blank=True, default="")
    receiver_name = models.CharField(max_length=255, blank=True, default="")
    receiver_email = models.EmailField(blank=True, default="")
    receiver_phone = models.CharField(max_length=50, blank=True, default="")
    receiver_organisation = models.CharField(max_length=255, blank=True, default="")
    warehouse = models.ForeignKey(
        'Warehouse', on_delete=models.SET_NULL, null=True, blank=True, related_name='dispatches'
    )
    transfer_type = models.CharField(max_length=30, choices=TRANSFER_TYPES)
    from_supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name="outgoing"
    )
    from_branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="outgoing"
    )
    to_branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="incoming"
    )
    farmer = models.ForeignKey(
        Farmer, on_delete=models.SET_NULL, null=True, blank=True, related_name="deliveries"
    )
    quantity_bags = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DISPATCHED)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    BUYER_MINISTRY = "MINISTRY"
    BUYER_WALK_IN = "WALK_IN"
    BUYER_TYPES = [
        (BUYER_MINISTRY, "Ministry-registered buyer"),
        (BUYER_WALK_IN, "Walk-in buyer"),
    ]
    buyer_type = models.CharField(
        max_length=20, choices=BUYER_TYPES, default=BUYER_MINISTRY, blank=True
    )
    ministry_verified = models.BooleanField(
        default=False,
        help_text="True when the buyer was matched to the Ministry of Agriculture registry.",
    )
    discount_percent = models.PositiveSmallIntegerField(
        default=0,
        help_text="Subsidy or discount applied for this sale (e.g. registered farmers).",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    rejection_message = models.TextField(blank=True, default="")
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_transfers",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def clean(self):
        if self.transfer_type == self.SUPPLIER_TO_BRANCH:
            if not self.from_supplier or not self.to_branch:
                raise ValidationError("Supplier transfers require from_supplier and to_branch.")
        if self.transfer_type == self.BRANCH_TO_FARMER:
            if not self.from_branch or not self.farmer:
                raise ValidationError("Farmer transfers require from_branch and farmer.")

    def __str__(self):
        return f"{self.batch.batch_code} - {self.transfer_type}"


class DeliveryProof(models.Model):
    transfer = models.ForeignKey(
        Transfer, on_delete=models.CASCADE, related_name="proofs"
    )
    file = models.FileField(upload_to="delivery_proofs/", blank=True, null=True)
    cid = models.CharField(max_length=200, blank=True)
    gps_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Issue(models.Model):
    OUTSTANDING = "OUTSTANDING"
    RESOLVED = "RESOLVED"
    STATUS_CHOICES = [
        (OUTSTANDING, "Outstanding"),
        (RESOLVED, "Resolved"),
    ]

    COMPLAINT = "COMPLAINT"
    DISCREPANCY = "DISCREPANCY"
    ISSUE_TYPES = [
        (COMPLAINT, "Complaint"),
        (DISCREPANCY, "Discrepancy"),
    ]

    transfer = models.ForeignKey(
        Transfer, on_delete=models.CASCADE, related_name="issues"
    )
    issue_type = models.CharField(max_length=20, choices=ISSUE_TYPES)
    summary = models.CharField(max_length=200)
    description = models.TextField()
    evidence_file = models.FileField(upload_to="issues/", blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OUTSTANDING)
    resolution_notes = models.TextField(blank=True)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reported_issues",
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_issues",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_issue_type_display()} on {self.transfer_id}"


class OTPVerification(models.Model):
    SENT = "SENT"
    VERIFIED = "VERIFIED"
    EXPIRED = "EXPIRED"
    FAILED = "FAILED"
    STATUS_CHOICES = [
        (SENT, "Sent"),
        (VERIFIED, "Verified"),
        (EXPIRED, "Expired"),
        (FAILED, "Failed"),
    ]

    transfer = models.OneToOneField(
        Transfer, on_delete=models.CASCADE, related_name="otp_verification"
    )
    phone_number = models.CharField(max_length=30)
    code = models.CharField(max_length=10)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=SENT)
    sent_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)


class BlockchainAnchor(models.Model):
    transfer = models.OneToOneField(
        Transfer, on_delete=models.CASCADE, related_name="blockchain_anchor"
    )
    data_hash = models.CharField(max_length=128)
    tx_hash = models.CharField(max_length=200, blank=True)
    network = models.CharField(max_length=60, default="polygon")
    anchored_at = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(default=dict, blank=True)


class AuditLog(models.Model):
    action = models.CharField(max_length=200)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    transfer = models.ForeignKey(
        Transfer, on_delete=models.SET_NULL, null=True, blank=True
    )
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    TYPE_DISPATCH = "dispatch"
    TYPE_RECEIPT = "receipt"
    TYPE_DELIVERY = "delivery"
    TYPE_OTP = "otp"
    TYPE_REGISTRY = "registry"
    TYPE_STOCK = "stock"
    TYPE_SYSTEM = "system"
    TYPE_CHOICES = [
        (TYPE_DISPATCH, "Dispatch"),
        (TYPE_RECEIPT, "Receipt"),
        (TYPE_DELIVERY, "Delivery"),
        (TYPE_OTP, "OTP"),
        (TYPE_REGISTRY, "Registry"),
        (TYPE_STOCK, "Stock"),
        (TYPE_SYSTEM, "System"),
    ]

    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, "Low"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_HIGH, "High"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    details = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM
    )
    read_at = models.DateTimeField(null=True, blank=True)
    transfer = models.ForeignKey(
        Transfer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} → {self.user_id}"


class Order(models.Model):
    """A fertilizer order placed by a Branch (Retailer or AMCOS) to a Supplier."""

    # Order types
    STANDARD = "STANDARD"
    CUSTOM = "CUSTOM"
    ORDER_TYPES = [
        (STANDARD, "Standard (from existing batch)"),
        (CUSTOM, "Custom (special request)"),
    ]

    # Order statuses
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (PENDING, "Pending Review"),
        (ACCEPTED, "Accepted"),
        (REJECTED, "Rejected"),
        (PROCESSING, "Processing"),
        (DISPATCHED, "Awaiting Verification"),
        (READY, "En Route"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
    ]

    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="orders"
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.CASCADE, related_name="received_orders"
    )
    order_type = models.CharField(max_length=10, choices=ORDER_TYPES, default=STANDARD)
    fertilizer_type = models.CharField(max_length=120)
    quantity_bags = models.PositiveIntegerField()
    unit_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=50)
    # For standard orders: the specific batch requested
    preferred_batch = models.ForeignKey(
        FertilizerBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_requests",
    )
    # For custom orders: specifications text
    custom_specifications = models.TextField(blank=True)
    delivery_address = models.CharField(max_length=255, blank=True)
    required_by_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)

    # Supplier response
    supplier_notes = models.TextField(blank=True)
    rejected_reason = models.TextField(blank=True)

    # Link to the Transfer once dispatched
    linked_transfer = models.ForeignKey(
        Transfer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_orders",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placed_orders",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} – {self.branch.name} → {self.supplier.name} ({self.status})"


class UserProfile(models.Model):
    """Lightweight extension for fields not on Django's built-in User model."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    contact_phone = models.CharField(max_length=50, blank=True, default="")
    organization = models.CharField(max_length=200, blank=True, default="")

    def __str__(self):
        return f"Profile({self.user.username})"


class IntegrityCheckQueue(models.Model):
    """Queue populated by PostgreSQL trigger when transfers are edited outside Django."""

    transfer_id = models.IntegerField(db_index=True)
    source = models.CharField(max_length=32, default="db_trigger")
    queued_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["queued_at"]

    def __str__(self):
        return f"IntegrityCheck(transfer={self.transfer_id}, source={self.source})"
