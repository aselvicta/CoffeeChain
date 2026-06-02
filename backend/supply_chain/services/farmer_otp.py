"""Dispatch farmer OTP via Briq Karibu only."""

from __future__ import annotations

from typing import Any

from .briq import EXTERNAL_OTP_PLACEHOLDER, is_briq_provider, request_otp as briq_request_otp
from .briq import resend_otp as briq_resend_otp
from .briq import verify_otp as briq_verify_otp

_VALID_DELIVERY_METHODS = {"sms", "call", "whatsapp"}


def _normalize_delivery_method(method: str | None) -> str:
    key = (method or "sms").lower().strip()
    return key if key in _VALID_DELIVERY_METHODS else "sms"


def dispatch_farmer_otp(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    is_resend: bool = False,
    delivery_method: str = "sms",
) -> tuple[str | None, dict[str, Any]]:
    """Send an OTP to a farmer phone through Briq only."""
    if not is_briq_provider():
        return None, {
            "provider": "none",
            "delivered": False,
            "phone_number": phone_number,
            "error": "Farmer OTP requires SMS_PROVIDER=briq in backend/.env",
        }

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
    """Verify a farmer-submitted OTP with Briq."""
    return briq_verify_otp(otp_record.phone_number, clean_code)
