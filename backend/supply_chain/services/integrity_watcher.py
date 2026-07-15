"""Background watcher for transfer integrity — catches pgAdmin / direct SQL edits."""

from __future__ import annotations

import logging
import os
import sys
import threading
import time

from django.conf import settings
from django.db import close_old_connections, connection

logger = logging.getLogger(__name__)

_watcher_started = False
_watcher_lock = threading.Lock()
_last_status: dict[int, str] = {}
_ADVISORY_LOCK_KEY = 0xC0FFEE01


def _try_advisory_lock() -> bool:
    if connection.vendor != "postgresql":
        return True
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_try_advisory_lock(%s)", [_ADVISORY_LOCK_KEY])
        return bool(cursor.fetchone()[0])


def _release_advisory_lock() -> None:
    if connection.vendor != "postgresql":
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_unlock(%s)", [_ADVISORY_LOCK_KEY])
    except Exception:
        logger.exception("[IntegrityWatcher] failed to release advisory lock")


def process_transfer_integrity(
    transfer_id: int, *, restored_fields: list | None = None
) -> None:
    """Verify one transfer and notify admins on status transitions."""
    from supply_chain.models import Transfer
    from supply_chain.services.integrity import verify_transfer_integrity
    from supply_chain.services.notifications import (
        notify_for_integrity_mismatch,
        notify_for_integrity_restored,
    )

    transfer = (
        Transfer.objects.select_related("batch", "farmer", "from_branch", "blockchain_anchor")
        .filter(pk=transfer_id, blockchain_anchor__isnull=False)
        .first()
    )
    if not transfer:
        return

    result = verify_transfer_integrity(transfer, check_chain=False)
    current = result.status
    previous = _last_status.get(transfer_id)

    if current == "mismatch" and previous != "mismatch":
        notify_for_integrity_mismatch(result)
    elif current == "ok" and previous == "mismatch":
        notify_for_integrity_restored(result, restored_fields=restored_fields)

    if current in ("ok", "mismatch"):
        _last_status[transfer_id] = current


def process_integrity_queue(limit: int = 50) -> int:
    """Drain pending DB trigger queue items. Returns number of transfers checked."""
    from supply_chain.models import IntegrityCheckQueue

    pending = list(IntegrityCheckQueue.objects.order_by("queued_at")[:limit])
    if not pending:
        return 0

    transfer_ids = []
    seen = set()
    for item in pending:
        if item.transfer_id not in seen:
            seen.add(item.transfer_id)
            transfer_ids.append(item.transfer_id)

    for transfer_id in transfer_ids:
        process_transfer_integrity(transfer_id)

    IntegrityCheckQueue.objects.filter(pk__in=[item.pk for item in pending]).delete()
    return len(transfer_ids)


def scan_all_verified_transfers() -> int:
    """Full scan of anchored verified farmer deliveries. Returns transfers checked."""
    from supply_chain.models import Transfer

    transfer_ids = list(
        Transfer.objects.filter(
            status=Transfer.VERIFIED,
            blockchain_anchor__isnull=False,
            transfer_type=Transfer.BRANCH_TO_FARMER,
        ).values_list("id", flat=True)
    )
    for transfer_id in transfer_ids:
        process_transfer_integrity(transfer_id)
    return len(transfer_ids)


def _watcher_loop() -> None:
    interval = max(5, int(getattr(settings, "INTEGRITY_WATCHER_INTERVAL_SECONDS", 30)))
    full_scan_every = max(1, int(getattr(settings, "INTEGRITY_WATCHER_FULL_SCAN_EVERY", 4)))
    cycle = 0

    logger.info(
        "[IntegrityWatcher] running (interval=%ss, full_scan_every=%s cycles)",
        interval,
        full_scan_every,
    )

    while True:
        try:
            close_old_connections()
            if not _try_advisory_lock():
                time.sleep(interval)
                continue

            try:
                processed = process_integrity_queue()
                if processed:
                    logger.info("[IntegrityWatcher] processed %s queued transfer(s)", processed)

                cycle += 1
                if cycle >= full_scan_every:
                    total = scan_all_verified_transfers()
                    logger.debug("[IntegrityWatcher] full scan completed (%s transfers)", total)
                    cycle = 0
            finally:
                _release_advisory_lock()
        except Exception:
            logger.exception("[IntegrityWatcher] cycle failed")

        time.sleep(interval)


def start_integrity_watcher() -> None:
    """Start daemon thread once per process (skipped during tests and autoreload parent)."""
    global _watcher_started

    if not getattr(settings, "INTEGRITY_WATCHER_ENABLED", True):
        return
    if "test" in sys.argv:
        return
    if os.environ.get("RUN_MAIN") == "false":
        return

    with _watcher_lock:
        if _watcher_started:
            return
        _watcher_started = True

    thread = threading.Thread(
        target=_watcher_loop,
        name="integrity-watcher",
        daemon=True,
    )
    thread.start()
    logger.info("[IntegrityWatcher] background thread started")
