from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditLogViewSet,
    AuditReportView,
    AdminUserViewSet,
    BlockchainAnchorViewSet,
    BranchViewSet,
    DeliveryProofViewSet,
    FarmerViewSet,
    FertilizerBatchViewSet,
    FertilizerTypeCatalogView,
    IntegrityCheckView,
    IntegrityScanView,
    IntegrityTransferView,
    IssueViewSet,
    MeView,
    NotificationViewSet,
    OrderViewSet,
    OTPVerificationViewSet,
    PendingRegistrationViewSet,
    PublicRegisterView,
    ReceiptCallbackView,
    ReportsView,
    SupplierCatalogView,
    SupplierViewSet,
    TransferViewSet,
    WarehouseCatalogView,
    WarehouseViewSet,
)


router = DefaultRouter()
router.register("suppliers", SupplierViewSet)
router.register("users", AdminUserViewSet, basename="users")
router.register("branches", BranchViewSet)
router.register("farmers", FarmerViewSet)
router.register("batches", FertilizerBatchViewSet)
router.register("transfers", TransferViewSet)
router.register("proofs", DeliveryProofViewSet)
router.register("issues", IssueViewSet)
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("warehouses", WarehouseViewSet)
router.register("otps", OTPVerificationViewSet)
router.register("anchors", BlockchainAnchorViewSet)
router.register("audit-logs", AuditLogViewSet)
router.register("registrations", PendingRegistrationViewSet, basename="registrations")
router.register("orders", OrderViewSet, basename="orders")


urlpatterns = [
    path("", include(router.urls)),
    path("compliance/", include("compliance.urls")),
    path("warehouse-catalog/", WarehouseCatalogView.as_view(), name="warehouse-catalog"),
    path("supplier-catalog/", SupplierCatalogView.as_view(), name="supplier-catalog"),
    path("fertilizer-types/", FertilizerTypeCatalogView.as_view(), name="fertilizer-types"),
    path("reports/audit/", AuditReportView.as_view(), name="audit-report"),
    path("reports/", ReportsView.as_view(), name="reports"),
    path("auth/register/", PublicRegisterView.as_view(), name="public-register"),
    path(
        "internal/receipt-callback/",
        ReceiptCallbackView.as_view(),
        name="receipt-callback",
    ),
    path("integrity/", IntegrityCheckView.as_view(), name="integrity-check"),
    path("integrity/scan/", IntegrityScanView.as_view(), name="integrity-scan"),
    path("integrity/<int:transfer_id>/", IntegrityTransferView.as_view(), name="integrity-transfer"),
    path("me/", MeView.as_view(), name="me"),
]
