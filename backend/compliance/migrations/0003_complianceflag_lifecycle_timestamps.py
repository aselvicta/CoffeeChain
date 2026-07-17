from django.db import migrations, models


def backfill_lifecycle_timestamps(apps, schema_editor):
    ComplianceFlag = apps.get_model("compliance", "ComplianceFlag")
    AdminRecommendation = apps.get_model("compliance", "AdminRecommendation")

    for flag in ComplianceFlag.objects.all().iterator():
        updates = {}
        if flag.status == "under_review" and flag.reviewed_at is None:
            updates["reviewed_at"] = flag.updated_at or flag.created_at
        elif flag.status == "escalated":
            if flag.escalated_at is None:
                updates["escalated_at"] = flag.updated_at or flag.created_at
            if flag.reviewed_at is None:
                updates["reviewed_at"] = flag.created_at
        elif flag.status == "resolved":
            if flag.resolved_at is None:
                updates["resolved_at"] = flag.updated_at or flag.created_at
            if flag.reviewed_at is None:
                updates["reviewed_at"] = flag.created_at

        rec = AdminRecommendation.objects.filter(flag_id=flag.id).first()
        if rec is not None:
            if rec.admin_decision in ("actioned", "dismissed") and (
                flag.resolved_at is None and "resolved_at" not in updates
            ):
                updates["resolved_at"] = rec.decided_at or flag.updated_at or flag.created_at
            if rec.recommended_action != "no_action" and (
                flag.escalated_at is None and "escalated_at" not in updates
            ):
                updates["escalated_at"] = rec.created_at
            if (
                flag.reviewed_at is None
                and "reviewed_at" not in updates
                and (
                    rec.recommended_action == "no_action"
                    or flag.status in ("under_review", "escalated", "resolved")
                )
            ):
                updates["reviewed_at"] = rec.created_at or flag.created_at

        if updates:
            ComplianceFlag.objects.filter(pk=flag.pk).update(**updates)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0002_organisation_certificate"),
    ]

    operations = [
        migrations.AddField(
            model_name="complianceflag",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="complianceflag",
            name="escalated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="complianceflag",
            name="resolved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_lifecycle_timestamps, noop_reverse),
    ]
