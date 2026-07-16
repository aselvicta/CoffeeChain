from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminRecommendationViewSet,
    ComplianceFlagViewSet,
    OrganisationCertificateViewSet,
    OrganisationComplianceStatusView,
)


router = DefaultRouter()
router.register("flags", ComplianceFlagViewSet, basename="compliance-flag")
router.register("recommendations", AdminRecommendationViewSet, basename="compliance-recommendation")
router.register("certificates", OrganisationCertificateViewSet, basename="organisation-certificate")


urlpatterns = router.urls + [
    path("organisations/status/", OrganisationComplianceStatusView.as_view(), name="organisation-compliance-status"),
]
