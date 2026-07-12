"""Create in-app notifications for supply-chain events."""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from supply_chain.models import Branch, Notification, Supplier, Transfer

logger = logging.getLogger(__name__)


User = get_user_model()


def _create(
    user,
    *,
    notification_type: str,
    title: str,
    message: str,
    details: str = "",
    priority: str = Notification.PRIORITY_MEDIUM,
    transfer=None,
    metadata=None,
):
    if not user:
        return None
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        details=details,
        priority=priority,
        transfer=transfer,
        metadata=metadata or {},
    )


def _users_for_group(group_name: str):
    return User.objects.filter(groups__name=group_name).distinct()


def _notify_users(users, **kwargs):
    created = []
    for user in users:
        if user:
            note = _create(user, **kwargs)
            if note:
                created.append(note)
    return created


def _branch_user(branch):
    if branch and branch.user_id:
        return branch.user
    return None


def _supplier_user(supplier):
    if supplier and supplier.user_id:
        return supplier.user
    return None


def notify_regulators(**kwargs):
    return _notify_users(_users_for_group("Regulator"), **kwargs)


def notify_admins(**kwargs):
    return _notify_users(User.objects.filter(is_staff=True), **kwargs)


def _warehouse_managers_for_supplier(supplier):
    if not supplier:
        return User.objects.none()
    return User.objects.filter(
        warehouse_manager_profile__supplier_id=supplier.id
    ).distinct()


def notify_for_transfer_pending(transfer: Transfer, actor=None):
    transfer = (
        Transfer.objects.select_related(
            "batch",
            "from_supplier",
            "to_branch",
            "warehouse",
        )
        .filter(pk=transfer.pk)
        .first()
        or transfer
    )
    batch_code = transfer.batch.batch_code if transfer.batch else "Batch"
    fertilizer = transfer.batch.fertilizer_type if transfer.batch else "Fertilizer"
    bags = transfer.quantity_bags
    supplier_name = (
        transfer.from_supplier.name if transfer.from_supplier else "Supplier"
    )
    branch_name = transfer.to_branch.name if transfer.to_branch else "Branch"
    warehouse_name = transfer.warehouse.name if transfer.warehouse else "Warehouse"

    _notify_users(
        _warehouse_managers_for_supplier(transfer.from_supplier),
        notification_type=Notification.TYPE_DISPATCH,
        title="Dispatch awaiting approval",
        message=(
            f"{bags} bags of {fertilizer} ({batch_code}) to {branch_name} "
            f"need warehouse approval."
        ),
        details=f"Transfer #{transfer.id} • {warehouse_name}",
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={"transfer_id": transfer.id, "tab": "pending"},
    )

    supplier_user = _supplier_user(transfer.from_supplier)
    if supplier_user:
        _create(
            supplier_user,
            notification_type=Notification.TYPE_DISPATCH,
            title="Dispatch submitted",
            message=f"{bags} bags to {branch_name} submitted for warehouse approval.",
            details=f"Transfer #{transfer.id} • Pending manager confirmation.",
            priority=Notification.PRIORITY_MEDIUM,
            transfer=transfer,
            metadata={"transfer_id": transfer.id, "tab": "dispatched"},
        )


def notify_for_transfer_rejected(transfer: Transfer, message: str, actor=None):
    transfer = (
        Transfer.objects.select_related("batch", "from_supplier", "to_branch", "warehouse")
        .filter(pk=transfer.pk)
        .first()
        or transfer
    )
    batch_code = transfer.batch.batch_code if transfer.batch else "Batch"
    branch_name = transfer.to_branch.name if transfer.to_branch else "Branch"

    _create(
        _supplier_user(transfer.from_supplier),
        notification_type=Notification.TYPE_SYSTEM,
        title="Dispatch not approved",
        message=(
            f"Warehouse manager rejected {transfer.quantity_bags} bags "
            f"({batch_code}) to {branch_name}."
        ),
        details=message,
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={"transfer_id": transfer.id, "tab": "dispatched", "rejected": True},
    )


def notify_for_transfer_created(transfer: Transfer, actor=None):
    transfer = (
        Transfer.objects.select_related(
            "batch",
            "from_supplier",
            "to_branch",
            "from_branch",
            "farmer",
        )
        .filter(pk=transfer.pk)
        .first()
        or transfer
    )
    batch_code = transfer.batch.batch_code if transfer.batch else "Batch"
    fertilizer = transfer.batch.fertilizer_type if transfer.batch else "Fertilizer"
    bags = transfer.quantity_bags

    if transfer.transfer_type == Transfer.SUPPLIER_TO_BRANCH:
        supplier_name = (
            transfer.from_supplier.name if transfer.from_supplier else "Supplier"
        )
        branch_name = transfer.to_branch.name if transfer.to_branch else "Branch"
        branch_user = _branch_user(transfer.to_branch)

        _create(
            branch_user,
            notification_type=Notification.TYPE_DISPATCH,
            title="Incoming fertilizer shipment",
            message=(
                f"{bags} bags of {fertilizer} ({batch_code}) dispatched from "
                f"{supplier_name}."
            ),
            details=f"Transfer #{transfer.id} • Confirm receipt when stock arrives.",
            priority=Notification.PRIORITY_HIGH,
            transfer=transfer,
            metadata={"transfer_id": transfer.id, "tab": "receive"},
        )

        supplier_user = _supplier_user(transfer.from_supplier)
        if supplier_user and supplier_user != actor:
            _create(
                supplier_user,
                notification_type=Notification.TYPE_DISPATCH,
                title="Dispatch recorded",
                message=f"Sent {bags} bags to {branch_name}.",
                details=f"Transfer #{transfer.id} • Awaiting receipt confirmation.",
                priority=Notification.PRIORITY_LOW,
                transfer=transfer,
                metadata={"transfer_id": transfer.id, "tab": "dispatch"},
            )

        notify_regulators(
            notification_type=Notification.TYPE_DISPATCH,
            title="Supplier dispatch logged",
            message=f"{supplier_name} → {branch_name}: {bags} bags.",
            details=f"Transfer #{transfer.id}",
            priority=Notification.PRIORITY_LOW,
            transfer=transfer,
        )
        return

    if transfer.transfer_type == Transfer.BRANCH_TO_FARMER:
        branch = transfer.from_branch
        farmer = transfer.farmer
        branch_name = branch.name if branch else "Branch"
        farmer_name = farmer.name if farmer else "Farmer"
        discount = transfer.discount_percent or 0
        discount_note = (
            f"{discount}% subsidy applied."
            if transfer.ministry_verified and discount
            else "Walk-in / standard price."
        )

        _create(
            _branch_user(branch),
            notification_type=Notification.TYPE_OTP,
            title="Distribution started",
            message=f"{bags} bags to {farmer_name} — send OTP to complete.",
            details=f"Transfer #{transfer.id} • {discount_note}",
            priority=Notification.PRIORITY_MEDIUM,
            transfer=transfer,
            metadata={"transfer_id": transfer.id, "tab": "verification"},
        )

        if farmer and farmer.cooperative_id:
            coop_user = _branch_user(farmer.cooperative)
            if coop_user and coop_user != _branch_user(branch):
                _create(
                    coop_user,
                    notification_type=Notification.TYPE_DELIVERY,
                    title="Member fertilizer distribution",
                    message=(
                        f"{farmer_name} ({farmer.ministry_id}) received {bags} bags "
                        f"via {branch_name}."
                    ),
                    details=f"Transfer #{transfer.id} • Pending farmer OTP.",
                    priority=Notification.PRIORITY_MEDIUM,
                    transfer=transfer,
                )

        notify_regulators(
            notification_type=Notification.TYPE_DELIVERY,
            title="Farmer distribution recorded",
            message=f"{branch_name} → {farmer_name}: {bags} bags.",
            details=f"Transfer #{transfer.id}",
            priority=Notification.PRIORITY_LOW,
            transfer=transfer,
        )


def notify_for_transfer_received(transfer: Transfer, actor=None):
    transfer = (
        Transfer.objects.select_related(
            "batch", "from_supplier", "to_branch", "from_branch"
        )
        .filter(pk=transfer.pk)
        .first()
        or transfer
    )
    branch_name = transfer.to_branch.name if transfer.to_branch else "Branch"
    supplier = transfer.from_supplier
    batch_code = transfer.batch.batch_code if transfer.batch else "Batch"

    _create(
        _supplier_user(supplier),
        notification_type=Notification.TYPE_RECEIPT,
        title="Delivery confirmed",
        message=f"{branch_name} confirmed receipt of {transfer.quantity_bags} bags.",
        details=f"Transfer #{transfer.id} • {batch_code}",
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={"transfer_id": transfer.id},
    )

    _create(
        _branch_user(transfer.to_branch),
        notification_type=Notification.TYPE_RECEIPT,
        title="Receipt confirmed",
        message=f"Stock updated for {batch_code} ({transfer.quantity_bags} bags).",
        details="You can now distribute to farmers.",
        priority=Notification.PRIORITY_MEDIUM,
        transfer=transfer,
        metadata={"transfer_id": transfer.id, "tab": "distribute"},
    )

    notify_regulators(
        notification_type=Notification.TYPE_RECEIPT,
        title="Branch receipt confirmed",
        message=f"{branch_name} received transfer #{transfer.id}.",
        details=f"{transfer.quantity_bags} bags of {transfer.batch.fertilizer_type if transfer.batch else 'fertilizer'}",
        priority=Notification.PRIORITY_LOW,
        transfer=transfer,
    )


def notify_for_otp_sent(transfer: Transfer):
    transfer = Transfer.objects.select_related("farmer", "from_branch").filter(
        pk=transfer.pk
    ).first() or transfer
    farmer = transfer.farmer
    if not farmer:
        return

    _create(
        _branch_user(transfer.from_branch),
        notification_type=Notification.TYPE_OTP,
        title="OTP sent to farmer",
        message=f"Verification code sent to {farmer.phone_number}.",
        details=f"Transfer #{transfer.id} • {farmer.name}",
        priority=Notification.PRIORITY_LOW,
        transfer=transfer,
        metadata={"transfer_id": transfer.id, "tab": "verification"},
    )


def notify_for_otp_verified(transfer: Transfer, anchor_summary=None):
    transfer = (
        Transfer.objects.select_related(
            "batch", "from_supplier", "to_branch", "from_branch", "farmer"
        )
        .filter(pk=transfer.pk)
        .first()
        or transfer
    )
    farmer = transfer.farmer
    farmer_name = farmer.name if farmer else "Farmer"
    branch_name = transfer.from_branch.name if transfer.from_branch else "Branch"
    anchor_summary = anchor_summary or {}
    cid = anchor_summary.get("cid", "")
    tx = anchor_summary.get("tx_hash", "")

    proof = ""
    if cid:
        proof = f"Receipt CID: {cid[:20]}…"
    if tx:
        proof = f"{proof} Tx: {tx[:16]}…" if proof else f"Tx: {tx[:16]}…"

    _create(
        _branch_user(transfer.from_branch),
        notification_type=Notification.TYPE_DELIVERY,
        title="Distribution verified",
        message=f"{farmer_name} confirmed OTP for {transfer.quantity_bags} bags.",
        details=proof or f"Transfer #{transfer.id} locked on trust ledger.",
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={"transfer_id": transfer.id, "tab": "verification"},
    )

    if transfer.from_supplier_id:
        _create(
            _supplier_user(transfer.from_supplier),
            notification_type=Notification.TYPE_DELIVERY,
            title="Downstream delivery verified",
            message=(
                f"{branch_name} completed verified delivery to {farmer_name} "
                f"({transfer.quantity_bags} bags)."
            ),
            details=proof or f"Transfer #{transfer.id}",
            priority=Notification.PRIORITY_MEDIUM,
            transfer=transfer,
        )

    if farmer and farmer.cooperative_id:
        _create(
            _branch_user(farmer.cooperative),
            notification_type=Notification.TYPE_DELIVERY,
            title="Member delivery verified",
            message=f"{farmer_name} confirmed fertilizer receipt ({transfer.quantity_bags} bags).",
            details=proof or f"Transfer #{transfer.id}",
            priority=Notification.PRIORITY_HIGH,
            transfer=transfer,
        )

    notify_regulators(
        notification_type=Notification.TYPE_DELIVERY,
        title="Verified farmer delivery",
        message=f"{branch_name} → {farmer_name}: {transfer.quantity_bags} bags verified.",
        details=proof or f"Transfer #{transfer.id}",
        priority=Notification.PRIORITY_MEDIUM,
        transfer=transfer,
    )


def notify_for_farmer_registered(farmer, branch: Branch, actor=None):
    if not branch or branch.branch_type != Branch.COOPERATIVE:
        return
    coop_user = _branch_user(branch)
    _create(
        coop_user,
        notification_type=Notification.TYPE_REGISTRY,
        title="Farmer registered",
        message=f"{farmer.name} ({farmer.ministry_id}) added to {branch.name}.",
        details="Ready for fertilizer distribution.",
        priority=Notification.PRIORITY_MEDIUM,
        metadata={"ministry_id": farmer.ministry_id, "tab": "farmers"},
    )
    notify_regulators(
        notification_type=Notification.TYPE_REGISTRY,
        title="New farmer registration",
        message=f"{farmer.name} registered with {branch.name}.",
        details=farmer.ministry_id,
        priority=Notification.PRIORITY_LOW,
    )


def _format_change_line(change: dict) -> str:
    """Build a human-readable 'changed from X to Y' line from a change dict."""
    field = (change.get("field") or "field").replace("_", " ").title()
    # Support both integrity-compare keys (database/receipt) and signal keys (old/new)
    old_val = change.get("receipt") if "receipt" in change else change.get("old")
    new_val = change.get("database") if "database" in change else change.get("new")
    if old_val is None and new_val is None:
        return f"{field} mismatch detected"
    if field.lower() == "data hash":
        return f"Hash changed from {str(old_val)[:12]}… to {str(new_val)[:12]}…"
    return f"{field} changed from {old_val!s} to {new_val!s}"


def _format_restore_line(change: dict) -> str:
    """Build a human-readable restore line when data is corrected back to receipt."""
    field = (change.get("field") or "field").replace("_", " ").title()
    old_val = change.get("old")
    new_val = change.get("new")
    if old_val is not None and new_val is not None:
        return f"{field} restored from {old_val!s} to {new_val!s} (matches receipt)"
    return f"{field} restored to original receipt value"


def _had_prior_integrity_alert(transfer_id: int) -> bool:
    """True if this transfer previously triggered a tampering alert."""
    return Notification.objects.filter(
        transfer_id=transfer_id,
        metadata__integrity_alert=True,
    ).exists()


def notify_for_integrity_mismatch(result) -> bool:
    """Alert admins when a verified transfer fails integrity checks.

    Returns True if a new notification was created.
    """
    # result is always an IntegrityResult dataclass; use getattr only
    transfer_id = getattr(result, "transfer_id", None)
    if not transfer_id:
        return False

    recent_cutoff = timezone.now() - timezone.timedelta(hours=24)
    recent_alert = (
        Notification.objects.filter(
            notification_type=Notification.TYPE_SYSTEM,
            transfer_id=transfer_id,
            metadata__integrity_alert=True,
            created_at__gte=recent_cutoff,
        )
        .order_by("-created_at")
        .first()
    )
    if recent_alert:
        restored_after_alert = Notification.objects.filter(
            transfer_id=transfer_id,
            metadata__integrity_restored=True,
            created_at__gt=recent_alert.created_at,
        ).exists()
        if not restored_after_alert:
            return False

    batch_code = getattr(result, "batch_code", None) or "Unknown batch"
    branch_name = getattr(result, "branch_name", None) or ""
    changes = getattr(result, "changes", None) or []
    issues = getattr(result, "issues", None) or []
    explorer_url = getattr(result, "explorer_url", None)
    transfer = Transfer.objects.filter(pk=transfer_id).first()

    change_lines = [_format_change_line(change) for change in changes]

    issue_summary = change_lines[0] if change_lines else (issues[0] if issues else "Data mismatch detected.")

    # Build a concise change summary for the notification message itself
    field_changes_short = "; ".join(change_lines[:2]) if change_lines else ""
    notification_message = (
        f"Transfer #{transfer_id}"
        + (f" ({batch_code})" if batch_code else "")
        + (f" at {branch_name}" if branch_name else "")
        + (f": {field_changes_short}." if field_changes_short else " — data mismatch detected.")
    )

    details_lines = [
        f"Transfer #{transfer_id} · {batch_code}",
    ]
    if branch_name:
        details_lines.append(f"Branch: {branch_name}")
    details_lines.extend(change_lines)
    last_mod = getattr(result, "last_api_modification", None)
    if last_mod and last_mod.get("username"):
        details_lines.append(
            f"Last updated by: {last_mod['username']} "
            f"({last_mod.get('modified_at', '')[:19].replace('T', ' ')})"
        )
        for change in last_mod.get("changes") or []:
            details_lines.append(
                f"  · {change.get('field')}: {change.get('old')!s} → {change.get('new')!s}"
            )
    elif changes:
        details_lines.append(
            "Direct database edit detected — the record was changed outside the app (no linked user)"
        )
    if explorer_url:
        details_lines.append(f"Polygon: {explorer_url}")

    notify_admins(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Critical: data tampering — Transfer #{transfer_id}",
        message=notification_message,
        details="\n".join(details_lines),
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={
            "integrity_alert": True,
            "tab": "integrity",
            "transfer_id": transfer_id,
            "explorer_url": explorer_url,
            "changes": changes,
            "last_api_modification": last_mod,
        },
    )
    regulator_message = (
        f"Transfer #{transfer_id}"
        + (f" at {branch_name}" if branch_name else "")
        + (f": {field_changes_short}." if field_changes_short else " — possible tampering detected.")
    )
    notify_regulators(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Integrity alert — Transfer #{transfer_id}",
        message=regulator_message,
        details="\n".join(details_lines[:6]),
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={
            "integrity_alert": True,
            "tab": "integrity",
            "transfer_id": transfer_id,
            "changes": changes,
        },
    )

    # SMS alert to all admin phone numbers
    _send_integrity_sms(
        transfer_id=transfer_id,
        batch_code=batch_code,
        branch_name=branch_name,
        change_lines=change_lines,
        issue_summary=issue_summary,
    )
    return True


def notify_for_integrity_restored(result, restored_fields=None) -> bool:
    """Send positive feedback when data is corrected back to match the receipt.

    Only fires if a prior tampering alert existed for this transfer.
    Returns True if a new notification was created.
    """
    transfer_id = getattr(result, "transfer_id", None)
    if not transfer_id:
        return False

    if not _had_prior_integrity_alert(transfer_id):
        return False

    recent_cutoff = timezone.now() - timezone.timedelta(hours=24)
    recent_restore = (
        Notification.objects.filter(
            transfer_id=transfer_id,
            metadata__integrity_restored=True,
            created_at__gte=recent_cutoff,
        )
        .order_by("-created_at")
        .first()
    )
    if recent_restore:
        alert_after_restore = Notification.objects.filter(
            transfer_id=transfer_id,
            metadata__integrity_alert=True,
            created_at__gt=recent_restore.created_at,
        ).exists()
        if not alert_after_restore:
            return False

    batch_code = getattr(result, "batch_code", None) or "Unknown batch"
    branch_name = getattr(result, "branch_name", None) or ""
    transfer = Transfer.objects.filter(pk=transfer_id).first()

    if restored_fields:
        restore_lines = [_format_restore_line(cf) for cf in restored_fields]
        summary = "; ".join(restore_lines)
    else:
        summary = "All fields now match the original receipt."

    notification_message = (
        f"Transfer #{transfer_id}"
        + (f" ({batch_code})" if batch_code else "")
        + (f" at {branch_name}" if branch_name else "")
        + f": {summary}"
    )

    details_lines = [
        f"Transfer #{transfer_id} · {batch_code}",
        "Status: Data integrity restored — database matches Storacha receipt.",
    ]
    if branch_name:
        details_lines.append(f"Branch: {branch_name}")
    if restored_fields:
        details_lines.extend(restore_lines)
    else:
        field_comparison = getattr(result, "field_comparison", None) or {}
        for key, row in field_comparison.items():
            if row.get("match"):
                details_lines.append(
                    f"{key.replace('_', ' ').title()}: {row.get('database')!s} ✓"
                )

    notify_admins(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Resolved: Transfer #{transfer_id} data restored",
        message=notification_message,
        details="\n".join(details_lines),
        priority=Notification.PRIORITY_MEDIUM,
        transfer=transfer,
        metadata={
            "integrity_restored": True,
            "tab": "integrity",
            "transfer_id": transfer_id,
            "restored_fields": restored_fields or [],
        },
    )
    notify_regulators(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Resolved: Transfer #{transfer_id} integrity restored",
        message=notification_message,
        details="\n".join(details_lines[:5]),
        priority=Notification.PRIORITY_MEDIUM,
        transfer=transfer,
        metadata={
            "integrity_restored": True,
            "tab": "integrity",
            "transfer_id": transfer_id,
        },
    )

    _send_integrity_restored_sms(
        transfer_id=transfer_id,
        batch_code=batch_code,
        summary=summary,
    )
    return True


def _send_integrity_sms(
    *,
    transfer_id: int,
    batch_code: str,
    branch_name: str,
    change_lines: list[str],
    issue_summary: str,
) -> None:
    """Send an SMS alert to every admin who has a phone number configured."""
    try:
        from supply_chain.models import UserProfile
        from .briq import send_sms, normalize_phone_digits

        admin_users = User.objects.filter(is_staff=True)
        all_changes = "; ".join(change_lines) if change_lines else issue_summary
        sms_body = (
            f"CoffeeChain ALERT: Transfer #{transfer_id}"
            + (f" ({batch_code})" if batch_code else "")
            + f". {all_changes}. Login to review."
        )
        # Truncate to 160 chars
        sms_body = sms_body[:160]

        for admin in admin_users:
            phone = ""
            try:
                up = admin.profile
                phone = (up.contact_phone or "").strip()
            except Exception:
                pass
            if not phone or phone.strip("+").strip().replace(" ", "") in ("255", ""):
                continue
            result = send_sms(phone, sms_body)
            logger.info(
                "[Integrity] SMS alert to admin %s (%s): delivered=%s",
                admin.username,
                normalize_phone_digits(phone),
                result.get("delivered"),
            )
    except Exception:
        logger.exception("[Integrity] Failed to send integrity SMS to admins")


def _send_integrity_restored_sms(
    *,
    transfer_id: int,
    batch_code: str,
    summary: str,
) -> None:
    """Send a positive SMS when transfer data is restored to match the receipt."""
    try:
        from .briq import send_sms, normalize_phone_digits

        admin_users = User.objects.filter(is_staff=True)
        sms_body = (
            f"CoffeeChain: Transfer #{transfer_id}"
            + (f" ({batch_code})" if batch_code else "")
            + f" restored. {summary}. Data matches receipt."
        )
        sms_body = sms_body[:160]

        for admin in admin_users:
            phone = ""
            try:
                up = admin.profile
                phone = (up.contact_phone or "").strip()
            except Exception:
                pass
            if not phone or phone.strip("+").strip().replace(" ", "") in ("255", ""):
                continue
            result = send_sms(phone, sms_body)
            logger.info(
                "[Integrity] Restore SMS to admin %s (%s): delivered=%s",
                admin.username,
                normalize_phone_digits(phone),
                result.get("delivered"),
            )
    except Exception:
        logger.exception("[Integrity] Failed to send restore SMS to admins")
