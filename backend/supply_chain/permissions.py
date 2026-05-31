from rest_framework.permissions import BasePermission


def has_group(user, group_name):
    if not user or not user.is_authenticated:
        return False
    normalized_group_name = group_name.casefold()
    return any(existing_group.name.casefold() == normalized_group_name for existing_group in user.groups.all())


class IsSupplier(BasePermission):
    def has_permission(self, request, view):
        return has_group(request.user, "Supplier")


class IsRetailer(BasePermission):
    def has_permission(self, request, view):
        return has_group(request.user, "Retailer")


class IsCooperative(BasePermission):
    def has_permission(self, request, view):
        return has_group(request.user, "Cooperative")


class IsRegulator(BasePermission):
    def has_permission(self, request, view):
        return has_group(request.user, "Regulator")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class SupplierOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return IsSupplier().has_permission(request, view) or IsAdmin().has_permission(request, view)


class RegulatorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return IsRegulator().has_permission(request, view) or IsAdmin().has_permission(request, view)


class CooperativeOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return IsCooperative().has_permission(request, view) or IsAdmin().has_permission(request, view)


class BranchStaffOrAdmin(BasePermission):
    """Cooperatives and retailers that register or serve farmers."""

    def has_permission(self, request, view):
        return (
            IsCooperative().has_permission(request, view)
            or IsRetailer().has_permission(request, view)
            or IsAdmin().has_permission(request, view)
        )
