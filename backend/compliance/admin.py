from django.contrib import admin

from .models import AdminRecommendation, ComplianceFlag, FlagResponse, OrganisationCertificate


@admin.register(ComplianceFlag)
class ComplianceFlagAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "target_type",
        "target_id",
        "status",
        "raised_by",
        "created_at",
        "reviewed_at",
        "escalated_at",
        "resolved_at",
    )
    list_filter = ("status", "target_type")
    search_fields = ("reason", "description", "evidence_ref")
    readonly_fields = ("created_at", "updated_at", "reviewed_at", "escalated_at", "resolved_at")


@admin.register(FlagResponse)
class FlagResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "flag", "responded_by", "created_at")
    search_fields = ("message",)


@admin.register(AdminRecommendation)
class AdminRecommendationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "flag",
        "recommended_action",
        "admin_decision",
        "recommended_by",
        "decided_by",
        "created_at",
    )
    list_filter = ("recommended_action", "admin_decision")


@admin.register(OrganisationCertificate)
class OrganisationCertificateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "document_type",
        "status",
        "is_active",
        "expires_on",
        "supplier",
        "branch",
        "uploaded_by",
        "reviewed_by",
        "created_at",
    )
    list_filter = ("status", "document_type", "is_active")
    search_fields = ("certificate_number", "issuing_authority", "notes")
