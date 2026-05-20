import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from supply_chain.models import Branch, Farmer


class Command(BaseCommand):
    help = "Import farmers from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            required=True,
            help="Path to the CSV file with farmer data.",
        )
        parser.add_argument(
            "--create-cooperatives",
            action="store_true",
            help="Create cooperative branches if they do not exist.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["path"]).expanduser().resolve()
        if not csv_path.exists():
            raise CommandError(f"CSV file not found: {csv_path}")

        created = 0
        updated = 0
        skipped = 0

        with csv_path.open("r", newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            required_fields = {"ministry_id", "name", "phone_number"}
            if not required_fields.issubset(reader.fieldnames or []):
                raise CommandError(
                    "CSV must include headers: ministry_id, name, phone_number."
                )

            for row in reader:
                ministry_id = (row.get("ministry_id") or "").strip()
                name = (row.get("name") or "").strip()
                phone_number = (row.get("phone_number") or "").strip()
                district = (row.get("district") or "").strip()
                cooperative_name = (row.get("cooperative_name") or "").strip()

                if not ministry_id or not name or not phone_number:
                    skipped += 1
                    continue

                cooperative = None
                if cooperative_name:
                    cooperative = (
                        Branch.objects.filter(
                            name__iexact=cooperative_name, branch_type=Branch.COOPERATIVE
                        )
                        .order_by("id")
                        .first()
                    )
                    if not cooperative and options["create_cooperatives"]:
                        cooperative = Branch.objects.create(
                            name=cooperative_name,
                            branch_type=Branch.COOPERATIVE,
                            district=district,
                            region=(row.get("region") or "").strip(),
                        )

                farmer, was_created = Farmer.objects.update_or_create(
                    ministry_id=ministry_id,
                    defaults={
                        "name": name,
                        "phone_number": phone_number,
                        "district": district,
                        "cooperative": cooperative,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Farmers import complete. Created: {created}, "
                f"Updated: {updated}, Skipped: {skipped}."
            )
        )
