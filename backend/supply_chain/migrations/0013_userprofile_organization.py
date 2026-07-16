from django.db import migrations, models


def add_organization_column(apps, schema_editor):
    table_name = "supply_chain_userprofile"
    column_name = "organization"

    existing_columns = {
        column.name
        for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(), table_name
        )
    }

    if column_name in existing_columns:
        return

    schema_editor.execute(
        "ALTER TABLE supply_chain_userprofile "
        "ADD COLUMN organization varchar(200) NOT NULL DEFAULT '';"
    )


class Migration(migrations.Migration):
    """
    organization may already exist if 0012_userprofile was applied after the field
    was folded into CreateModel; add the column only when missing.
    """

    dependencies = [
        ("supply_chain", "0012_userprofile"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_organization_column, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="userprofile",
                    name="organization",
                    field=models.CharField(blank=True, default="", max_length=200),
                ),
            ],
        ),
    ]
