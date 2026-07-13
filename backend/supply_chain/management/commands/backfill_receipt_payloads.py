"""Copy receipt JSON from disk or IPFS into anchor.payload for production durability."""

import json

from django.core.management.base import BaseCommand

from supply_chain.models import BlockchainAnchor
from supply_chain.services.ipfs import (
    _fetch_receipt_from_ipfs,
    _is_local_cid,
    receipt_file_path,
    save_receipt_to_db,
)


class Command(BaseCommand):
    help = "Backfill verification receipts into the database from disk or IPFS."

    def handle(self, *args, **options):
        updated = 0
        skipped = 0
        missing = 0

        for anchor in BlockchainAnchor.objects.select_related("transfer").iterator():
            payload = anchor.payload or {}
            if payload.get("receipt"):
                skipped += 1
                continue

            transfer_id = anchor.transfer_id
            receipt = None

            path = receipt_file_path(transfer_id)
            if path.exists():
                try:
                    receipt = json.loads(path.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError) as exc:
                    self.stderr.write(
                        f"Transfer #{transfer_id}: could not read local file — {exc}"
                    )

            if not receipt:
                cid = payload.get("cid", "")
                if cid and not _is_local_cid(cid):
                    receipt = _fetch_receipt_from_ipfs(cid)

            if receipt:
                save_receipt_to_db(transfer_id, receipt)
                updated += 1
                self.stdout.write(f"Transfer #{transfer_id}: receipt saved to database.")
            else:
                missing += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated {updated}, already present {skipped}, still missing {missing}."
            )
        )
        if missing:
            self.stdout.write(
                "Transfers still missing receipts cannot be recovered unless re-verified."
            )
