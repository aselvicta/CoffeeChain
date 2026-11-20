from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.decorators.http import require_http_methods
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


@require_http_methods(["GET", "HEAD"])
def health_check(request):
    """Lightweight liveness probe for uptime monitors (e.g. UptimeRobot HEAD checks)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    re_path(r"^health/?$", health_check, name="health_check"),
    path("admin/", admin.site.urls),
    path("api/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("supply_chain.urls")),
]

# Receipts fall back to MEDIA_ROOT when Storacha is down — serve them in production too.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
