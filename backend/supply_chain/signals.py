import logging

from django.db.models import Sum
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import FertilizerBatch, Transfer, Warehouse

logger = logging.getLogger(__name__)

# Fields that, if changed, indicate a potential data compromise
_TAMPER_SENSITIVE_FIELDS = ("quantity_bags", "batch_id", "farmer_id", "status")


def recalculate_warehouse_stock(warehouse):
    if not warehouse:
        return
    total_bags = warehouse.batches.aggregate(total=Sum("quantity_bags"))["total"] or 0
    if warehouse.current_bags == total_bags:
        return
    warehouse.current_bags = total_bags
    warehouse.save(update_fields=["current_bags"])


@receiver(pre_save, sender=FertilizerBatch)
def cache_previous_storage_location(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_storage_location_id = None
        return
    instance._previous_storage_location_id = (
        sender.objects.filter(pk=instance.pk).values_list("storage_location_id", flat=True).first()
    )


@receiver(post_save, sender=FertilizerBatch)
def sync_warehouse_stock_on_save(sender, instance, **kwargs):
    previous_storage_location_id = getattr(instance, "_previous_storage_location_id", None)
    if previous_storage_location_id and previous_storage_location_id != instance.storage_location_id:
        previous_warehouse = Warehouse.objects.filter(pk=previous_storage_location_id).first()
        recalculate_warehouse_stock(previous_warehouse)
    if instance.storage_location:
        recalculate_warehouse_stock(instance.storage_location)


@receiver(post_delete, sender=FertilizerBatch)
def sync_warehouse_stock_on_delete(sender, instance, **kwargs):
    if instance.storage_location:
        recalculate_warehouse_stock(instance.storage_location)


# ─── Transfer tampering detection ───────────────────────────────────────────

@receiver(pre_save, sender=Transfer)
def capture_transfer_snapshot(sender, instance, **kwargs):
    """Snapshot sensitive fields before any save so we can detect changes after."""
    if not instance.pk:
        instance._pre_save_snapshot = None
        return
    try:
        prev = sender.objects.filter(pk=instance.pk).values(*_TAMPER_SENSITIVE_FIELDS).first()
        instance._pre_save_snapshot = prev
    except Exception:
        instance._pre_save_snapshot = None


@receiver(post_save, sender=Transfer)
def detect_transfer_tampering(sender, instance, created, **kwargs):
    """After saving, compare new values to snapshot. Alert if sensitive fields changed."""
    if created:
        return
    snapshot = getattr(instance, "_pre_save_snapshot", None)
    if not snapshot:
        return

    changed_fields = []
    for field in _TAMPER_SENSITIVE_FIELDS:
        old_val = snapshot.get(field)
        new_val = getattr(instance, field, None)
        if old_val != new_val:
            changed_fields.append({"field": field.replace("_id", "").replace("_", " "), "old": old_val, "new": new_val})

    if not changed_fields:
        return

    # Only alert if transfer has a blockchain anchor (i.e. it was verified / on-chain)
    try:
        has_anchor = instance.blockchain_anchor is not None
    except Exception:
        has_anchor = False

    if not has_anchor:
        return

    logger.warning(
        "[Tamper] Transfer #%s modified after anchoring: %s",
        instance.pk,
        changed_fields,
    )

    # Run integrity check and fire notifications in a thread to avoid blocking the save
    try:
        import threading
        threading.Thread(
            target=_run_integrity_check_and_notify,
            args=(instance.pk, changed_fields),
            daemon=True,
        ).start()
    except Exception:
        logger.exception("[Tamper] Failed to start integrity check thread")


def _run_integrity_check_and_notify(transfer_pk: int, changed_fields: list) -> None:
    """Run in a background thread: full integrity check + notification + SMS."""
    try:
        from supply_chain.services.integrity_watcher import process_transfer_integrity

        process_transfer_integrity(transfer_pk, restored_fields=changed_fields)
    except Exception:
        logger.exception("[Tamper] Integrity check thread failed for Transfer #%s", transfer_pk)