import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0013_userprofile_organization"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order_type", models.CharField(
                    choices=[("STANDARD", "Standard (from existing batch)"), ("CUSTOM", "Custom (special request)")],
                    default="STANDARD",
                    max_length=10,
                )),
                ("fertilizer_type", models.CharField(max_length=120)),
                ("quantity_bags", models.PositiveIntegerField()),
                ("unit_weight_kg", models.DecimalField(decimal_places=2, default=50, max_digits=6)),
                ("custom_specifications", models.TextField(blank=True)),
                ("delivery_address", models.CharField(blank=True, max_length=255)),
                ("required_by_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(
                    choices=[
                        ("PENDING", "Pending Supplier Review"),
                        ("ACCEPTED", "Accepted by Supplier"),
                        ("REJECTED", "Rejected by Supplier"),
                        ("PROCESSING", "Processing in Warehouse"),
                        ("READY", "Ready for Dispatch"),
                        ("DISPATCHED", "Dispatched"),
                        ("DELIVERED", "Delivered"),
                        ("CANCELLED", "Cancelled"),
                    ],
                    default="PENDING",
                    max_length=15,
                )),
                ("supplier_notes", models.TextField(blank=True)),
                ("rejected_reason", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="orders",
                    to="supply_chain.branch",
                )),
                ("supplier", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="received_orders",
                    to="supply_chain.supplier",
                )),
                ("preferred_batch", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="order_requests",
                    to="supply_chain.fertilizerbatch",
                )),
                ("linked_transfer", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="source_orders",
                    to="supply_chain.transfer",
                )),
                ("created_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="placed_orders",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
