from django.db import migrations, models, connection


CREATE_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION supply_chain_transfer_tamper_queue()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.quantity_bags IS DISTINCT FROM OLD.quantity_bags
            OR NEW.batch_id IS DISTINCT FROM OLD.batch_id
            OR NEW.farmer_id IS DISTINCT FROM OLD.farmer_id
            OR NEW.status IS DISTINCT FROM OLD.status) THEN
            INSERT INTO supply_chain_integritycheckqueue (transfer_id, source, queued_at)
            VALUES (NEW.id, 'db_trigger', NOW());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transfer_tamper_integrity_queue ON supply_chain_transfer;
CREATE TRIGGER transfer_tamper_integrity_queue
    AFTER UPDATE ON supply_chain_transfer
    FOR EACH ROW
    EXECUTE PROCEDURE supply_chain_transfer_tamper_queue();
"""

DROP_TRIGGER_SQL = """
DROP TRIGGER IF EXISTS transfer_tamper_integrity_queue ON supply_chain_transfer;
DROP FUNCTION IF EXISTS supply_chain_transfer_tamper_queue();
"""


def create_postgres_trigger(apps, schema_editor):
    if connection.vendor != "postgresql":
        return
    schema_editor.execute(CREATE_TRIGGER_SQL)


def drop_postgres_trigger(apps, schema_editor):
    if connection.vendor != "postgresql":
        return
    schema_editor.execute(DROP_TRIGGER_SQL)


class Migration(migrations.Migration):

    dependencies = [
        ("supply_chain", "0015_alter_order_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="IntegrityCheckQueue",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("transfer_id", models.IntegerField(db_index=True)),
                ("source", models.CharField(default="db_trigger", max_length=32)),
                ("queued_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "ordering": ["queued_at"],
            },
        ),
        migrations.RunPython(create_postgres_trigger, drop_postgres_trigger),
    ]
