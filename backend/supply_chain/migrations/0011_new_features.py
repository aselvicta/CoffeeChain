from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0010_transfer_rejection_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Branch new fields
        migrations.AddField(
            model_name="branch",
            name="contact_phone",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="branch",
            name="shop_image",
            field=models.ImageField(blank=True, null=True, upload_to="branch_images/"),
        ),
        migrations.AddField(
            model_name="branch",
            name="location_lat",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="branch",
            name="location_lng",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        # Supplier new fields
        migrations.AddField(
            model_name="supplier",
            name="store_image",
            field=models.ImageField(blank=True, null=True, upload_to="supplier_images/"),
        ),
        migrations.AddField(
            model_name="supplier",
            name="location_lat",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="supplier",
            name="location_lng",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        # Warehouse assigned_manager
        migrations.AddField(
            model_name="warehouse",
            name="assigned_manager",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_warehouse",
                to="supply_chain.warehousemanager",
            ),
        ),
        # PendingRegistration model
        migrations.CreateModel(
            name="PendingRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("username", models.CharField(max_length=150, unique=True)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("password_hash", models.CharField(max_length=200)),
                ("role", models.CharField(
                    choices=[
                        ("supplier", "Supplier"),
                        ("retailer", "Retailer"),
                        ("cooperative", "Cooperative"),
                    ],
                    max_length=20,
                )),
                ("organisation_name", models.CharField(blank=True, max_length=200)),
                ("contact_phone", models.CharField(blank=True, max_length=30)),
                ("region", models.CharField(blank=True, max_length=120)),
                ("district", models.CharField(blank=True, max_length=120)),
                ("status", models.CharField(
                    choices=[
                        ("PENDING", "Pending"),
                        ("APPROVED", "Approved"),
                        ("REJECTED", "Rejected"),
                    ],
                    default="PENDING",
                    max_length=20,
                )),
                ("rejection_reason", models.TextField(blank=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="reviewed_registrations",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("created_user", models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="pending_registration",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
