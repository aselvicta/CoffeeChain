import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0008_fix_notification_schema"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WarehouseManager",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="warehouse_managers",
                        to="supply_chain.supplier",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="warehouse_manager_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AlterField(
            model_name="transfer",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending Approval"),
                    ("DISPATCHED", "Dispatched"),
                    ("RECEIVED", "Received"),
                    ("VERIFIED", "Verified"),
                ],
                default="DISPATCHED",
                max_length=20,
            ),
        ),
    ]
