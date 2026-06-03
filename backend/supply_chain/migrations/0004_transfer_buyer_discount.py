from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0003_transfer_warehouse"),
    ]

    operations = [
        migrations.AddField(
            model_name="transfer",
            name="buyer_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("MINISTRY", "Ministry-registered buyer"),
                    ("WALK_IN", "Walk-in buyer"),
                ],
                default="MINISTRY",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="transfer",
            name="ministry_verified",
            field=models.BooleanField(
                default=False,
                help_text="True when the buyer was matched to the Ministry of Agriculture registry.",
            ),
        ),
        migrations.AddField(
            model_name="transfer",
            name="discount_percent",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Subsidy or discount applied for this sale (e.g. registered farmers).",
            ),
        ),
    ]
