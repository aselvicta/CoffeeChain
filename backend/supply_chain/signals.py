from django.db.models import Sum
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import FertilizerBatch, Warehouse


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