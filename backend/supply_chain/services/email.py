"""Transactional email helpers for CoffeeChain (registration + dispatch receipts)."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _frontend_url(path: str = "") -> str:
    base = (getattr(settings, "FRONTEND_URL", None) or "http://localhost:5173").rstrip("/")
    if not path:
        return base
    return f"{base}/{path.lstrip('/')}"


def _from_email() -> str:
    return getattr(settings, "DEFAULT_FROM_EMAIL", None) or "CoffeeChain <noreply@coffeechain.local>"


def is_email_configured() -> bool:
    """True when SMTP credentials exist, or console/file backend is used for local/dev."""
    backend = (getattr(settings, "EMAIL_BACKEND", "") or "").lower()
    if "console" in backend or "locmem" in backend or "filebased" in backend:
        return True
    if "smtp" in backend:
        return bool(
            getattr(settings, "EMAIL_HOST", "")
            and getattr(settings, "EMAIL_HOST_USER", "")
        )
    return bool(getattr(settings, "EMAIL_HOST_USER", "") or getattr(settings, "EMAIL_HOST", ""))


def send_email(
    *,
    to: str | list[str],
    subject: str,
    template: str,
    context: dict[str, Any] | None = None,
    fail_silently: bool = True,
) -> bool:
    """
    Render an HTML template and send a multipart email.
    Returns True if the message was accepted by the backend.
    """
    recipients = [addr.strip() for addr in (to if isinstance(to, list) else [to]) if addr and str(addr).strip()]
    if not recipients:
        logger.info("[email] skipped — no recipient for subject=%s", subject)
        return False

    if not is_email_configured():
        logger.warning(
            "[email] skipped — email not configured (set EMAIL_* in .env). subject=%s to=%s",
            subject,
            recipients,
        )
        return False

    ctx = {
        "frontend_url": _frontend_url(),
        "login_url": _frontend_url("/login"),
        "app_name": "CoffeeChain",
        **(context or {}),
    }

    try:
        html_body = render_to_string(template, ctx)
        text_body = strip_tags(html_body)
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=_from_email(),
            to=recipients,
        )
        message.attach_alternative(html_body, "text/html")
        message.send(fail_silently=False)
        logger.info("[email] sent subject=%s to=%s", subject, recipients)
        return True
    except Exception:
        logger.exception("[email] failed subject=%s to=%s", subject, recipients)
        if not fail_silently:
            raise
        return False


def _user_email(user) -> str:
    if not user:
        return ""
    return (getattr(user, "email", None) or "").strip()


def _branch_email(branch) -> str:
    if not branch:
        return ""
    return _user_email(getattr(branch, "user", None))


def _supplier_email(supplier) -> str:
    if not supplier:
        return ""
    return _user_email(getattr(supplier, "user", None))


def _transfer_context(transfer) -> dict[str, Any]:
    batch = getattr(transfer, "batch", None)
    warehouse = getattr(transfer, "warehouse", None)
    supplier = getattr(transfer, "from_supplier", None)
    to_branch = getattr(transfer, "to_branch", None)
    return {
        "transfer_id": transfer.id,
        "status": transfer.status,
        "quantity_bags": transfer.quantity_bags,
        "batch_code": batch.batch_code if batch else "—",
        "fertilizer_type": batch.fertilizer_type if batch else "Fertilizer",
        "warehouse_name": warehouse.name if warehouse else "—",
        "supplier_name": supplier.name if supplier else "Supplier",
        "branch_name": to_branch.name if to_branch else "Branch",
        "branch_type": (to_branch.get_branch_type_display() if to_branch else "Branch"),
        "delivery_address": transfer.delivery_address or "—",
        "receiver_name": transfer.receiver_name
        or (to_branch.name if to_branch else "")
        or "Receiver",
        "rejection_message": getattr(transfer, "rejection_message", "") or "",
        "notes": transfer.notes or "",
        "receive_url": _frontend_url("/login"),
    }


# ── Registration ─────────────────────────────────────────────────────────────


def email_registration_received(registration) -> bool:
    if not registration.email:
        return False
    name = registration.first_name or registration.organisation_name or registration.username
    role = {
        "supplier": "Supplier",
        "retailer": "Retailer",
        "cooperative": "Cooperative (AMCOS)",
    }.get(registration.role, registration.role)
    return send_email(
        to=registration.email,
        subject="CoffeeChain — registration request received",
        template="email/registration_received.html",
        context={
            "name": name,
            "username": registration.username,
            "organisation": registration.organisation_name,
            "role": role,
            "region": registration.region,
            "district": registration.district,
        },
    )


def email_registration_approved(registration) -> bool:
    if not registration.email:
        return False
    name = registration.first_name or registration.organisation_name or registration.username
    role = {
        "supplier": "Supplier",
        "retailer": "Retailer",
        "cooperative": "Cooperative (AMCOS)",
    }.get(registration.role, registration.role)
    return send_email(
        to=registration.email,
        subject="CoffeeChain — your account has been approved",
        template="email/registration_approved.html",
        context={
            "name": name,
            "username": registration.username,
            "organisation": registration.organisation_name,
            "role": role,
        },
    )


def email_registration_rejected(registration) -> bool:
    if not registration.email:
        return False
    name = registration.first_name or registration.organisation_name or registration.username
    return send_email(
        to=registration.email,
        subject="CoffeeChain — registration request update",
        template="email/registration_rejected.html",
        context={
            "name": name,
            "username": registration.username,
            "organisation": registration.organisation_name,
            "reason": registration.rejection_reason or "No reason was provided.",
        },
    )


# ── Transfers / dispatch receipts ────────────────────────────────────────────


def resolve_transfer_receiver_email(transfer) -> str:
    """Prefer explicit receiver_email, then destination branch account email."""
    explicit = (getattr(transfer, "receiver_email", None) or "").strip()
    if explicit:
        return explicit
    return _branch_email(getattr(transfer, "to_branch", None))


def email_transfer_pending(transfer, recipients: list[str] | None = None) -> bool:
    """Notify warehouse managers that a supplier dispatch awaits approval."""
    emails = recipients or []
    if not emails:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        managers = User.objects.filter(
            warehouse_manager_profile__supplier_id=getattr(transfer.from_supplier, "id", None)
        ).exclude(email="")
        emails = [u.email.strip() for u in managers if u.email and u.email.strip()]

    if not emails:
        return False

    ctx = _transfer_context(transfer)
    return send_email(
        to=emails,
        subject=f"CoffeeChain — dispatch #{transfer.id} awaiting warehouse approval",
        template="email/transfer_pending.html",
        context=ctx,
    )


def email_transfer_dispatched(transfer) -> bool:
    """Receipt email to the retailer/cooperative when stock is dispatched."""
    to_email = resolve_transfer_receiver_email(transfer)
    if not to_email:
        logger.info("[email] no receiver email for transfer #%s", transfer.id)
        return False

    ctx = _transfer_context(transfer)
    return send_email(
        to=to_email,
        subject=f"CoffeeChain — fertilizer dispatch receipt #{transfer.id}",
        template="email/transfer_dispatched.html",
        context=ctx,
    )


def email_transfer_rejected(transfer) -> bool:
    """Notify supplier that warehouse rejected the dispatch."""
    to_email = _supplier_email(getattr(transfer, "from_supplier", None))
    if not to_email:
        return False
    ctx = _transfer_context(transfer)
    return send_email(
        to=to_email,
        subject=f"CoffeeChain — dispatch #{transfer.id} was not approved",
        template="email/transfer_rejected.html",
        context=ctx,
    )


def email_transfer_received(transfer) -> bool:
    """Notify supplier (and warehouse managers) that the branch confirmed receipt."""
    supplier_email = _supplier_email(getattr(transfer, "from_supplier", None))
    manager_emails: list[str] = []
    if transfer.from_supplier_id:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        managers = User.objects.filter(
            warehouse_manager_profile__supplier_id=transfer.from_supplier_id
        ).exclude(email="")
        manager_emails = [u.email.strip() for u in managers if u.email and u.email.strip()]

    recipients = []
    for addr in [supplier_email, *manager_emails]:
        if addr and addr not in recipients:
            recipients.append(addr)

    if not recipients:
        return False

    ctx = _transfer_context(transfer)
    return send_email(
        to=recipients,
        subject=f"CoffeeChain — delivery confirmed for dispatch #{transfer.id}",
        template="email/transfer_received.html",
        context=ctx,
    )


def email_dispatch_summary(
    *,
    receiver_email: str,
    receiver_name: str,
    supplier_name: str,
    transfer_rows: list[dict[str, Any]],
    transfer_ids: list[int],
) -> bool:
    """Batch summary used by the notify-receiver endpoint."""
    return send_email(
        to=receiver_email,
        subject=f"Fertilizer dispatch from {supplier_name} — Transfer IDs: {', '.join(map(str, transfer_ids))}",
        template="email/transfer_batch_summary.html",
        context={
            "receiver_name": receiver_name,
            "supplier_name": supplier_name,
            "transfer_ids": transfer_ids,
            "rows": transfer_rows,
            "total_bags": sum(int(r.get("quantity_bags") or 0) for r in transfer_rows),
        },
    )
