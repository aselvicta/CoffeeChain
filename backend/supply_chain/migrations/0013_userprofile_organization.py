from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0012_userprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="organization",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
