from django.db import migrations, models


def migrate_media_to_db(apps, schema_editor):
    OrganisationCertificate = apps.get_model("compliance", "OrganisationCertificate")
    for cert in OrganisationCertificate.objects.exclude(document="").exclude(document__isnull=True):
        try:
            cert.document.open("rb")
            data = cert.document.read()
            cert.document.close()
        except Exception:
            continue
        cert.document_data = data
        cert.document_filename = cert.document.name.rsplit("/", 1)[-1]
        cert.document_content_type = "application/octet-stream"
        cert.document_size = len(data)
        cert.save(update_fields=["document_data", "document_filename", "document_content_type", "document_size"])


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0003_complianceflag_lifecycle_timestamps"),
    ]

    operations = [
        migrations.AddField(
            model_name="organisationcertificate",
            name="document_content_type",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="organisationcertificate",
            name="document_data",
            field=models.BinaryField(default=b""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="organisationcertificate",
            name="document_filename",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="organisationcertificate",
            name="document_size",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(migrate_media_to_db, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="organisationcertificate",
            name="document",
        ),
    ]
