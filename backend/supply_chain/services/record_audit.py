"""Log structured before/after changes for sensitive records."""

from __future__ import annotations

from django.forms.models import model_to_dict

from supply_chain.models import AuditLog, Transfer


TRACKED_TRANSFER_FIELDS = (
    "quantity_bags",
    "status",
    "batch_id",
    "farmer_id",
    "from_branch_id",
    "to_branch_id",
    "from_supplier_id",
    "warehouse_id",
    "discount_percent",
    "ministry_verified",
    "buyer_type",
    "confirmed_at",
    "notes",
)


def _serialize_value(value):
    if value is None:
        return None
    if hasattr(value, "pk"):
        return value.pk
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def build_field_changes(instance, validated_data, fields=TRACKED_TRANSFER_FIELDS) -> list[dict]:
    changes = []
    for field in fields:
        if field not in validated_data:
            continue
        old_value = _serialize_value(getattr(instance, field, None))
        new_value = _serialize_value(validated_data[field])
        if old_value != new_value:
            changes.append({"field": field, "old": old_value, "new": new_value})
    return changes


def build_saved_field_changes(before: dict, instance, fields=TRACKED_TRANSFER_FIELDS) -> list[dict]:
    changes = []
    for field in fields:
        old_value = before.get(field)
        new_value = _serialize_value(getattr(instance, field, None))
        if old_value != new_value:
            changes.append({"field": field, "old": old_value, "new": new_value})
    return changes


def snapshot_transfer(instance: Transfer) -> dict:
    data = model_to_dict(instance, fields=list(TRACKED_TRANSFER_FIELDS))
    for key, value in data.items():
        data[key] = _serialize_value(value)
    return data


def log_transfer_modification(
    *,
    user,
    transfer: Transfer,
    changes: list[dict],
    action: str = "transfer_updated",
    via: str = "api",
    endpoint: str = "",
) -> AuditLog | None:
    if not changes:
        return None
    return AuditLog.objects.create(
        action=action,
        user=user,
        transfer=transfer,
        details={
            "via": via,
            "endpoint": endpoint,
            "model": "transfer",
            "changes": changes,
        },
    )


def get_last_api_modification(transfer_id: int) -> dict | None:
    """Return the most recent API-side modification for a transfer."""
    entry = (
        AuditLog.objects.filter(
            transfer_id=transfer_id,
            action__in=("transfer_updated", "transfer_received", "anchor_updated"),
        )
        .select_related("user")
        .order_by("-created_at")
        .first()
    )
    if not entry:
        return None
    username = entry.user.username if entry.user else None
    return {
        "username": username,
        "action": entry.action,
        "modified_at": entry.created_at.isoformat(),
        "changes": entry.details.get("changes") or [],
        "via": entry.details.get("via") or "api",
        "endpoint": entry.details.get("endpoint") or "",
    }
