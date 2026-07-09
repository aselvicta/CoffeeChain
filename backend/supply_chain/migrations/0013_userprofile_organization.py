from django.db import migrations, models


class Migration(migrations.Migration):
    """
    organization may already exist if 0012_userprofile was applied after the field
    was folded into CreateModel; use IF NOT EXISTS so redeploys do not fail.
    """

    dependencies = [
        ("supply_chain", "0012_userprofile"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE supply_chain_userprofile "
                "ADD COLUMN IF NOT EXISTS organization varchar(200) NOT NULL DEFAULT '';"
            ),
            reverse_sql=migrations.RunSQL.noop,
            state_operations=[
                migrations.AddField(
                    model_name="userprofile",
                    name="organization",
                    field=models.CharField(blank=True, default="", max_length=200),
                ),
            ],
        ),
    ]
