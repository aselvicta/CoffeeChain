from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0009_warehouse_manager_and_pending_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="transfer",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transfer",
            name="rejected_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rejected_transfers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="transfer",
            name="rejection_message",
            field=models.TextField(blank=True, default=""),
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
                    ("REJECTED", "Rejected"),
                ],
                default="DISPATCHED",
                max_length=20,
            ),
        ),
    ]
