from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("supply_chain", "0018_alter_order_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="ComplianceFlag",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_type", models.CharField(choices=[("transfer", "Transfer"), ("batch", "Batch"), ("dispatch", "Dispatch"), ("user_account", "User Account")], max_length=20)),
                ("target_id", models.PositiveIntegerField()),
                ("reason", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("evidence_ref", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("open", "Open"), ("under_review", "Under Review"), ("resolved", "Resolved"), ("escalated", "Escalated")], default="open", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("flagged_branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="compliance_flags", to="supply_chain.branch")),
                ("flagged_supplier", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="compliance_flags", to="supply_chain.supplier")),
                ("raised_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="compliance_flags_raised", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["status"], name="compliance_c_status_609ea4_idx"), models.Index(fields=["flagged_supplier", "status"], name="compliance_c_flagged_eb54cc_idx"), models.Index(fields=["flagged_branch", "status"], name="compliance_c_flagged_5df3a2_idx")],
            },
        ),
        migrations.CreateModel(
            name="FlagResponse",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("flag", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="responses", to="compliance.complianceflag")),
                ("responded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="AdminRecommendation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("recommended_action", models.CharField(choices=[("suspend", "Suspend account"), ("audit", "Full audit"), ("retrain", "Retrain / re-onboard"), ("warn", "Formal warning"), ("no_action", "No action needed")], max_length=20)),
                ("justification", models.TextField()),
                ("admin_decision", models.CharField(choices=[("pending", "Pending"), ("actioned", "Actioned"), ("dismissed", "Dismissed")], default="pending", max_length=20)),
                ("admin_decision_note", models.TextField(blank=True)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("decided_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="recommendations_decided", to=settings.AUTH_USER_MODEL)),
                ("flag", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="recommendation", to="compliance.complianceflag")),
                ("recommended_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recommendations_made", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["admin_decision"], name="compliance_a_admin_d_5fc574_idx")],
            },
        ),
    ]
