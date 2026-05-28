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
    MeView,
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
router.register("warehouses", WarehouseViewSet)
router.register("otps", OTPVerificationViewSet)
router.register("anchors", BlockchainAnchorViewSet)
router.register("audit-logs", AuditLogViewSet)


urlpatterns = [
    path("", include(router.urls)),
    path("warehouse-catalog/", WarehouseCatalogView.as_view(), name="warehouse-catalog"),
    path("reports/audit/", AuditReportView.as_view(), name="audit-report"),
    path("me/", MeView.as_view(), name="me"),
]
