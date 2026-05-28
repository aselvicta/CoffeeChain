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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.branch_type})"


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
    capacity_bags = models.PositiveIntegerField(default=0)
    current_bags = models.PositiveIntegerField(default=0)
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

    DISPATCHED = "DISPATCHED"
    RECEIVED = "RECEIVED"
    VERIFIED = "VERIFIED"
    STATUS_CHOICES = [
        (DISPATCHED, "Dispatched"),
        (RECEIVED, "Received"),
        (VERIFIED, "Verified"),
    ]

    batch = models.ForeignKey(
        FertilizerBatch, on_delete=models.CASCADE, related_name="transfers"
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
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
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
