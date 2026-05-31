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
