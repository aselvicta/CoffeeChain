from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class ComplianceFlag(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under Review"
        RESOLVED = "resolved", "Resolved"
        ESCALATED = "escalated", "Escalated"

    class TargetType(models.TextChoices):
        TRANSFER = "transfer", "Transfer"
        BATCH = "batch", "Batch"
        DISPATCH = "dispatch", "Dispatch"
        USER_ACCOUNT = "user_account", "User Account"

    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="compliance_flags_raised",
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.CharField(max_length=255)
    description = models.TextField()
    evidence_ref = models.CharField(max_length=255, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Lifecycle timestamps (created_at = when the flag was raised)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    flagged_supplier = models.ForeignKey(
        "supply_chain.Supplier",
        on_delete=models.CASCADE,
        related_name="compliance_flags",
        null=True,
        blank=True,
    )
    flagged_branch = models.ForeignKey(
        "supply_chain.Branch",
        on_delete=models.CASCADE,
        related_name="compliance_flags",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["flagged_supplier", "status"]),
            models.Index(fields=["flagged_branch", "status"]),
        ]

    def clean(self):
        has_supplier = bool(self.flagged_supplier_id)
        has_branch = bool(self.flagged_branch_id)
        if has_supplier == has_branch:
            raise ValidationError("Select exactly one flagged organization (supplier or branch).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class FlagResponse(models.Model):
    flag = models.ForeignKey(ComplianceFlag, on_delete=models.CASCADE, related_name="responses")
    responded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class AdminRecommendation(models.Model):
    class RecommendedAction(models.TextChoices):
        SUSPEND = "suspend", "Suspend account"
        AUDIT = "audit", "Full audit"
        RETRAIN = "retrain", "Retrain / re-onboard"
        WARN = "warn", "Formal warning"
        NO_ACTION = "no_action", "No action needed"

    class AdminDecision(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIONED = "actioned", "Actioned"
        DISMISSED = "dismissed", "Dismissed"

    flag = models.OneToOneField(
        ComplianceFlag,
        on_delete=models.CASCADE,
        related_name="recommendation",
    )
    recommended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recommendations_made",
    )
    recommended_action = models.CharField(max_length=20, choices=RecommendedAction.choices)
    justification = models.TextField()

    admin_decision = models.CharField(
        max_length=20,
        choices=AdminDecision.choices,
        default=AdminDecision.PENDING,
    )
    admin_decision_note = models.TextField(blank=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recommendations_decided",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["admin_decision"]),
        ]


class OrganisationCertificate(models.Model):
    """Paper/licence document uploaded by an organisation for regulator verification."""

    class DocumentType(models.TextChoices):
        BUSINESS_LICENSE = "business_license", "Business licence"
        FERTILIZER_DEALERSHIP = "fertilizer_dealership", "Fertilizer dealership permit"
        COOPERATIVE_REGISTRATION = "cooperative_registration", "Cooperative registration"
        TBS_CERTIFICATE = "tbs_certificate", "TBS / standards certificate"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING_REVIEW = "pending_review", "Pending review"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    supplier = models.ForeignKey(
        "supply_chain.Supplier",
        on_delete=models.CASCADE,
        related_name="organisation_certificates",
        null=True,
        blank=True,
    )
    branch = models.ForeignKey(
        "supply_chain.Branch",
        on_delete=models.CASCADE,
        related_name="organisation_certificates",
        null=True,
        blank=True,
    )

    document_type = models.CharField(max_length=40, choices=DocumentType.choices)
    certificate_number = models.CharField(max_length=120, blank=True)
    issuing_authority = models.CharField(max_length=255, blank=True)
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField()
    notes = models.TextField(blank=True)
    document = models.FileField(upload_to="organisation_certificates/")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_REVIEW,
    )
    is_active = models.BooleanField(default=False)

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="certificates_uploaded",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="certificates_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["expires_on", "status"]),
            models.Index(fields=["supplier", "status"]),
            models.Index(fields=["branch", "status"]),
        ]

    def clean(self):
        has_supplier = bool(self.supplier_id)
        has_branch = bool(self.branch_id)
        if has_supplier == has_branch:
            raise ValidationError("Select exactly one organisation (supplier or branch).")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
