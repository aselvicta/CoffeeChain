from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0016_integrity_check_queue"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="region",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="district",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
