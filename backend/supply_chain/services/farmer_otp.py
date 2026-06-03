"""Dispatch farmer OTP via Briq Karibu, with optional local fallback for demo/dev."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

from ..models import AuditLog, OTPVerification
from .briq import EXTERNAL_OTP_PLACEHOLDER, is_briq_provider, normalize_phone_digits
from .briq import request_otp as briq_request_otp
from .briq import resend_otp as briq_resend_otp
from .briq import verify_otp as briq_verify_otp
from .otp import generate_code, is_expired

_VALID_DELIVERY_METHODS = {"sms", "call", "whatsapp"}

_LEGACY_SMS_NOTE_MARKERS = (
    "simulated mode",
    "africas_talking",
    "sms_provider=simulated",
)


def _local_fallback_enabled() -> bool:
    return bool(getattr(settings, "BRIQ_OTP_LOCAL_FALLBACK", False))


def _sanitize_sms_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Drop obsolete simulated/Africa's Talking hints from API responses."""
    clean = dict(payload)
    note = (clean.get("note") or "").strip()
    if note and any(marker in note.lower() for marker in _LEGACY_SMS_NOTE_MARKERS):
        clean.pop("note", None)
    if (clean.get("provider") or "").lower() == "simulated":
        clean["provider"] = "briq"
        clean.pop("code_preview", None)
        clean.pop("sandbox_mode", None)
    return clean


def _normalize_delivery_method(method: str | None) -> str:
    key = (method or "sms").lower().strip()
    return key if key in _VALID_DELIVERY_METHODS else "sms"


def _resolve_delivery_method(
    *,
    is_resend: bool,
    explicit_method: str = "",
) -> str:
    if explicit_method:
        return _normalize_delivery_method(explicit_method)
    if is_resend:
        return _normalize_delivery_method(
            getattr(settings, "BRIQ_OTP_RESEND_METHOD", "call") or "call"
        )
    return _normalize_delivery_method(
        getattr(settings, "BRIQ_OTP_PRIMARY_METHOD", "sms") or "sms"
    )


def _dispatch_local_otp(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    is_resend: bool = False,
    delivery_method: str = "sms",
) -> tuple[str, dict[str, Any]]:
    """Generate a local OTP and optionally still try Briq delivery."""
    msisdn = normalize_phone_digits(phone_number)
    method = _normalize_delivery_method(delivery_method)
    code = generate_code()
    otp_length = int(getattr(settings, "OTP_CODE_LENGTH", 6))

    sms_payload: dict[str, Any] = {
        "provider": "local",
        "delivered": True,
        "phone_number": msisdn,
        "delivery_method": method,
        "otp_code_length": otp_length,
        "agent_code": code,
        "message": (
            "Briq SMS/call may not reach the farmer. Use the agent code below "
            "to complete verification."
        ),
    }

    briq_handler = briq_resend_otp if is_resend else briq_request_otp
    briq_payload = briq_handler(
        phone_number,
        quantity_bags=quantity_bags,
        fertilizer_type=fertilizer_type,
        delivery_method=method,
    )
    sms_payload["briq_attempted"] = bool(briq_payload.get("delivered"))
    if briq_payload.get("delivered"):
        sms_payload["provider"] = "briq+local"
        sms_payload["briq_api_message"] = briq_payload.get("briq_api_message")
        sms_payload["briq_duration_ms"] = briq_payload.get("briq_duration_ms")
        sms_payload["briq_http_status"] = briq_payload.get("briq_http_status")
        sms_payload["handset_note"] = briq_payload.get("handset_note")
    else:
        sms_payload["briq_error"] = briq_payload.get("error")

    logger.info(
        "Local OTP fallback code generated for %s method=%s briq_ok=%s",
        msisdn,
        method,
        sms_payload.get("briq_attempted"),
    )
    return code, sms_payload


def dispatch_farmer_otp(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    is_resend: bool = False,
    delivery_method: str = "sms",
) -> tuple[str | None, dict[str, Any]]:
    """Send an OTP to a farmer phone through Briq, or local fallback when enabled."""
    if not is_briq_provider():
        return None, {
            "provider": "none",
            "delivered": False,
            "phone_number": phone_number,
            "error": "Farmer OTP requires SMS_PROVIDER=briq in backend/.env",
        }

    if _local_fallback_enabled():
        return _dispatch_local_otp(
            phone_number,
            quantity_bags=quantity_bags,
            fertilizer_type=fertilizer_type,
            is_resend=is_resend,
            delivery_method=delivery_method,
        )

    method = _normalize_delivery_method(delivery_method)
    briq_handler = briq_resend_otp if is_resend else briq_request_otp
    sms_payload = briq_handler(
        phone_number,
        quantity_bags=quantity_bags,
        fertilizer_type=fertilizer_type,
        delivery_method=method,
    )
    if sms_payload.get("delivered"):
        return EXTERNAL_OTP_PLACEHOLDER, sms_payload
    return None, sms_payload


def verify_farmer_otp(otp_record, clean_code: str) -> dict[str, Any]:
    """Verify OTP locally when a real code is stored, otherwise via Briq."""
    stored = (otp_record.code or "").strip()
    if stored and stored != EXTERNAL_OTP_PLACEHOLDER:
        if is_expired(otp_record.sent_at):
            return {
                "verified": False,
                "error": "OTP expired. Request a new code.",
                "expired": True,
                "remaining_attempts": max(0, 3 - otp_record.attempts),
            }
        if stored == clean_code:
            return {"verified": True, "remaining_attempts": 0}
        remaining = max(0, 3 - (otp_record.attempts + 1))
        return {
            "verified": False,
            "error": "Invalid OTP code.",
            "remaining_attempts": remaining,
            "locked": remaining == 0,
        }
    return briq_verify_otp(otp_record.phone_number, clean_code)


def issue_distribution_otp(
    transfer,
    *,
    user=None,
    is_resend: bool = False,
    delivery_method: str = "",
) -> dict[str, Any]:
    """Send OTP SMS to the farmer on this distribution transfer.

    Returns API-safe payload keys: otp_sent, otp, sms, otp_code_length, detail.
    """
    from .notifications import notify_for_otp_sent

    if transfer.transfer_type != "BRANCH_TO_FARMER" or not transfer.farmer_id:
        return {
            "otp_sent": False,
            "detail": "OTP only applies to farmer distributions.",
        }

    farmer = transfer.farmer
    farmer_phone = normalize_phone_digits(farmer.phone_number)
    if not farmer_phone or len(farmer_phone) < 11:
        return {
            "otp_sent": False,
            "detail": (
                "Farmer phone number is invalid. Update the registry with a "
                "Tanzanian number like 0712345678."
            ),
            "sms": {
                "delivered": False,
                "phone_number": farmer.phone_number,
                "error": "Invalid farmer phone number.",
            },
        }

    fertilizer_type = ""
    if transfer.batch_id:
        fertilizer_type = transfer.batch.fertilizer_type or ""

    method = _resolve_delivery_method(
        is_resend=is_resend,
        explicit_method=delivery_method,
    )
    logger.info(
        "OTP dispatch start transfer_id=%s farmer_phone=%s resend=%s method=%s local_fallback=%s",
        transfer.id,
        farmer_phone,
        is_resend,
        method,
        _local_fallback_enabled(),
    )
    code, sms_payload = dispatch_farmer_otp(
        farmer_phone,
        quantity_bags=transfer.quantity_bags,
        fertilizer_type=fertilizer_type,
        is_resend=is_resend,
        delivery_method=method,
    )

    sms_payload = _sanitize_sms_payload(sms_payload)
    sms_payload.update(
        {
            "transfer_id": transfer.id,
            "sent_at": timezone.now().isoformat(),
            "backend_reached": True,
            "is_resend": is_resend,
        }
    )

    if not code or not sms_payload.get("delivered"):
        logger.warning(
            "OTP dispatch failed transfer_id=%s method=%s error=%s",
            transfer.id,
            method,
            sms_payload.get("error"),
        )
        return {
            "otp_sent": False,
            "detail": (
                sms_payload.get("error")
                or "OTP could not be sent to the farmer phone."
            ),
            "sms": sms_payload,
            "otp_code_length": int(
                sms_payload.get("otp_code_length") or settings.OTP_CODE_LENGTH
            ),
        }

    otp_record, _ = OTPVerification.objects.update_or_create(
        transfer=transfer,
        defaults={
            "phone_number": farmer_phone,
            "code": code,
            "status": OTPVerification.SENT,
            "sent_at": timezone.now(),
            "verified_at": None,
            "attempts": 0,
        },
    )
    notify_for_otp_sent(transfer)
    if user:
        AuditLog.objects.create(
            action="otp_sent",
            user=user,
            transfer=transfer,
            details={
                "phone_number": otp_record.phone_number,
                "provider": sms_payload.get("provider"),
                "delivery_method": method,
                "local_fallback": _local_fallback_enabled(),
            },
        )

    from ..serializers import OTPVerificationSerializer

    logger.info(
        "OTP dispatch ok transfer_id=%s method=%s duration_ms=%s phone=%s provider=%s",
        transfer.id,
        method,
        sms_payload.get("briq_duration_ms"),
        farmer_phone,
        sms_payload.get("provider"),
    )

    return {
        "otp_sent": True,
        "otp": OTPVerificationSerializer(otp_record).data,
        "sms": sms_payload,
        "otp_code_length": int(
            sms_payload.get("otp_code_length") or settings.OTP_CODE_LENGTH
        ),
    }
