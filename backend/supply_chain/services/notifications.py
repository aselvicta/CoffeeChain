"""Create in-app notifications for supply-chain events."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from supply_chain.models import Branch, Notification, Supplier, Transfer


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


def notify_for_integrity_mismatch(result) -> bool:
    """Alert admins when a verified transfer fails integrity checks.

    Returns True if a new notification was created.
    """
    transfer_id = getattr(result, "transfer_id", None) or result.get("transfer_id")
    if not transfer_id:
        return False

    recent_cutoff = timezone.now() - timezone.timedelta(hours=24)
    already_notified = Notification.objects.filter(
        notification_type=Notification.TYPE_SYSTEM,
        transfer_id=transfer_id,
        metadata__integrity_alert=True,
        created_at__gte=recent_cutoff,
    ).exists()
    if already_notified:
        return False

    batch_code = getattr(result, "batch_code", None) or result.get("batch_code") or "Unknown batch"
    branch_name = getattr(result, "branch_name", None) or result.get("branch_name") or ""
    changes = getattr(result, "changes", None) or result.get("changes") or []
    issues = getattr(result, "issues", None) or result.get("issues") or []
    explorer_url = getattr(result, "explorer_url", None) or result.get("explorer_url")
    transfer = Transfer.objects.filter(pk=transfer_id).first()

    change_lines = []
    for change in changes:
        field = change.get("field", "field")
        db_val = change.get("database")
        receipt_val = change.get("receipt")
        if field == "data hash":
            change_lines.append(
                f"Hash changed: DB {str(db_val)[:16]}… vs receipt {str(receipt_val)[:16]}…"
            )
        else:
            change_lines.append(f"{field.title()}: DB={db_val!s} → Receipt={receipt_val!s}")

    issue_summary = change_lines[0] if change_lines else (issues[0] if issues else "Data mismatch detected.")

    details_lines = [
        issue_summary,
        f"Transfer #{transfer_id} · {batch_code}",
    ]
    if branch_name:
        details_lines.append(f"Branch: {branch_name}")
    last_mod = getattr(result, "last_api_modification", None) or result.get("last_api_modification")
    if last_mod and last_mod.get("username"):
        details_lines.append(
            f"Last modified via API by: {last_mod['username']} "
            f"({last_mod.get('modified_at', '')[:19].replace('T', ' ')})"
        )
        for change in last_mod.get("changes") or []:
            details_lines.append(
                f"  · {change.get('field')}: {change.get('old')!s} → {change.get('new')!s}"
            )
    elif changes:
        details_lines.append(
            "Last modified via API by: unknown (possible direct database edit)"
        )
    if len(change_lines) > 1:
        details_lines.extend(change_lines[1:])
    if explorer_url:
        details_lines.append(f"Polygon: {explorer_url}")

    notify_admins(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Critical: data tampering — Transfer #{transfer_id}",
        message=(
            f"Database no longer matches the stored receipt for {batch_code}"
            + (f" at {branch_name}." if branch_name else ".")
        ),
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
    notify_regulators(
        notification_type=Notification.TYPE_SYSTEM,
        title=f"Integrity alert — Transfer #{transfer_id}",
        message=f"Possible tampering at {branch_name or batch_code}.",
        details="\n".join(details_lines[:4]),
        priority=Notification.PRIORITY_HIGH,
        transfer=transfer,
        metadata={
            "integrity_alert": True,
            "tab": "integrity",
            "transfer_id": transfer_id,
            "changes": changes,
        },
    )
    return True
