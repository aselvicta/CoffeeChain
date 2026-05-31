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
    MeView,
    NotificationViewSet,
    OTPVerificationViewSet,
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
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("warehouses", WarehouseViewSet)
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("otps", OTPVerificationViewSet)
router.register("anchors", BlockchainAnchorViewSet)
router.register("audit-logs", AuditLogViewSet)


urlpatterns = [
    path("", include(router.urls)),
    path("warehouse-catalog/", WarehouseCatalogView.as_view(), name="warehouse-catalog"),
    path("fertilizer-types/", FertilizerTypeCatalogView.as_view(), name="fertilizer-types"),
    path("reports/audit/", AuditReportView.as_view(), name="audit-report"),
    path("me/", MeView.as_view(), name="me"),
]
