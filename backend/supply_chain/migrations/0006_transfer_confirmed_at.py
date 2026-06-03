from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0005_notification"),
        ("supply_chain", "0005_warehouse_contact_fields_batch_receipt_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="transfer",
            name="confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]