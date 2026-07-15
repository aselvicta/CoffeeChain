from django.core.management.base import BaseCommand

from supply_chain.services.integrity_watcher import (
    process_integrity_queue,
    scan_all_verified_transfers,
)


class Command(BaseCommand):
    help = "Scan verified transfers for tampering (pgAdmin, direct SQL, or manual audit)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--full",
            action="store_true",
            help="Scan all verified transfers, not just the DB trigger queue.",
        )
        parser.add_argument(
            "--queue-only",
            action="store_true",
            help="Only process pending items from the PostgreSQL trigger queue.",
        )

    def handle(self, *args, **options):
        if options["queue_only"]:
            count = process_integrity_queue()
            self.stdout.write(self.style.SUCCESS(f"Processed {count} queued transfer(s)."))
            return

        if options["full"]:
            count = scan_all_verified_transfers()
            self.stdout.write(self.style.SUCCESS(f"Scanned {count} verified transfer(s)."))
            return

        queued = process_integrity_queue()
        scanned = scan_all_verified_transfers()
        self.stdout.write(
            self.style.SUCCESS(
                f"Processed {queued} queued + scanned {scanned} verified transfer(s)."
            )
        )
