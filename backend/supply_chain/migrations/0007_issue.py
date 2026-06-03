from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0006_transfer_confirmed_at"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Issue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("issue_type", models.CharField(choices=[("COMPLAINT", "Complaint"), ("DISCREPANCY", "Discrepancy")], max_length=20)),
                ("summary", models.CharField(max_length=200)),
                ("description", models.TextField()),
                ("evidence_file", models.FileField(blank=True, null=True, upload_to="issues/")),
                ("status", models.CharField(choices=[("OUTSTANDING", "Outstanding"), ("RESOLVED", "Resolved")], default="OUTSTANDING", max_length=20)),
                ("resolution_notes", models.TextField(blank=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reporter", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reported_issues", to=settings.AUTH_USER_MODEL)),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="resolved_issues", to=settings.AUTH_USER_MODEL)),
                ("transfer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="issues", to="supply_chain.transfer")),
            ],
        ),
    ]