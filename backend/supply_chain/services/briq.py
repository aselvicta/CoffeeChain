"""Briq Karibu OTP API — https://docs.briq.tz/guides/otp-requesting-codes"""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Stored in DB when Briq generates/sends the code (never returned by API).
EXTERNAL_OTP_PLACEHOLDER = "BRQEXT"

_CLIENT_HINT = (
    "A verification code was requested. Ask the farmer to answer their phone "
    "or check SMS/WhatsApp."
)


def is_briq_provider() -> bool:
    return (getattr(settings, "SMS_PROVIDER", "") or "").lower() == "briq"


def normalize_phone_digits(phone_number: str) -> str:
    raw = re.sub(r"\D", "", phone_number or "")
    if raw.startswith("00"):
        raw = raw[2:]
    if raw.startswith("0") and len(raw) >= 9:
        raw = "255" + raw[1:]
    if raw.startswith("255"):
        return raw
    if len(raw) == 9:
        return "255" + raw
    return raw


def build_otp_message_template(
    *,
    language: str = "en",
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
    branch_name: str = "",
    batch_code: str = "",
) -> str:
    """Build the SMS OTP template sent to the farmer (must include {code} and {expiry})."""

    custom = (getattr(settings, "BRIQ_OTP_MESSAGE_TEMPLATE", "") or "").strip()
    if custom and "{code}" in custom:
        return _substitute_template_vars(
            custom,
            bags=quantity_bags or 0,
            fertilizer=(fertilizer_type or "fertilizer").strip(),
            farmer_name=(farmer_name or "farmer").strip(),
            branch=(branch_name or "your branch").strip(),
            batch=(batch_code or "").strip(),
        )

    bags = quantity_bags or 0
    ftype = (fertilizer_type or "fertilizer").strip()
    farmer = (farmer_name or "farmer").strip()
    branch = (branch_name or "your branch").strip()
    sw = (language or "en").lower().startswith("sw")

    if sw:
        if bags:
            return (
                f"CoffeeChain: Habari {farmer}, thibitisha kupokea mifuko {bags} ya {ftype} "
                f"kutoka {branch}. Nambari yako ni {{code}}. Inaisha baada ya dakika {{expiry}}."
            )
        return (
            f"CoffeeChain: Nambari yako ya uthibitisho ni {{code}}. "
            f"Inaisha baada ya dakika {{expiry}}. Shiriki na wakala wako wa AMCOS."
        )

    if bags:
        return (
            f"CoffeeChain: Hi {farmer}, confirm receipt of {bags} bag(s) of {ftype} "
            f"from {branch}. Your code is {{code}}. Expires in {{expiry}} min."
        )
    return (
        "CoffeeChain: Confirm your fertilizer receipt. "
        "Your code is {code}. Expires in {expiry} min."
    )


def build_channel_delivery_hint(
    *,
    delivery_method: str,
    language: str = "en",
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
) -> str:
    """Staff-facing hint describing what the farmer received on each channel."""

    bags = quantity_bags or 0
    ftype = (fertilizer_type or "fertilizer").strip()
    farmer = (farmer_name or "the farmer").strip()
    sw = (language or "en").lower().startswith("sw")
    method = (delivery_method or "sms").lower().strip()

    if method == "call":
        if sw:
            return (
                f"Briq inapiga simu {farmer} kusoma nambari ya uthibitisho "
                f"wa mifuko {bags} ya {ftype}."
            )
        return (
            f"Briq is calling {farmer} to read the verification code "
            f"for {bags} bag(s) of {ftype}."
        )

    if method == "whatsapp":
        if sw:
            return (
                f"Nambari ya uthibitisho wa mifuko {bags} ya {ftype} "
                f"imetumwa WhatsApp kwa {farmer}."
            )
        return (
            f"Verification code for {bags} bag(s) of {ftype} "
            f"sent to {farmer} on WhatsApp."
        )

    if sw:
        return (
            f"Ujumbe wa uthibitisho wa mifuko {bags} ya {ftype} "
            f"umetumwa SMS kwa {farmer}."
        )
    return f"Receipt confirmation for {bags} bag(s) of {ftype} sent by SMS to {farmer}."


def _substitute_template_vars(template: str, **values: str | int) -> str:
    result = template
    for key, value in values.items():
        result = result.replace(f"{{{key}}}", str(value))
    return result


def _api_headers() -> dict[str, str]:
    return {
        "X-API-Key": getattr(settings, "BRIQ_API_KEY", ""),
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    return (getattr(settings, "BRIQ_BASE_URL", "https://karibu.briq.tz") or "").rstrip("/")


def _client_payload(
    *,
    delivered: bool,
    phone_number: str,
    error: str = "",
    message: str = "",
    **extra: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "provider": "briq",
        "delivered": delivered,
        "phone_number": phone_number,
        "message": message or _CLIENT_HINT,
    }
    if error:
        payload["error"] = error
    payload.update(extra)
    return payload


def _otp_request_body(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
    branch_name: str = "",
    batch_code: str = "",
    delivery_method: str = "sms",
) -> tuple[str, dict[str, Any], int]:
    msisdn = normalize_phone_digits(phone_number)
    otp_length = int(getattr(settings, "OTP_CODE_LENGTH", 6))
    minutes = int(getattr(settings, "OTP_EXPIRY_MINUTES", 10))
    language = getattr(settings, "BRIQ_OTP_LANGUAGE", "en")
    sender_id = (getattr(settings, "BRIQ_OTP_SENDER_ID", "") or "").strip()
    method = (delivery_method or "sms").lower().strip()

    body: dict[str, Any] = {
        "phone_number": msisdn,
        "app_key": getattr(settings, "BRIQ_APP_KEY", ""),
        "delivery_method": method,
        "otp_length": otp_length,
        "minutes_to_expire": minutes,
    }
    if method == "sms":
        body["message_template"] = build_otp_message_template(
            language=language,
            quantity_bags=quantity_bags,
            fertilizer_type=fertilizer_type,
            farmer_name=farmer_name,
            branch_name=branch_name,
            batch_code=batch_code,
        )
        if sender_id:
            body["sender_id"] = sender_id
    return msisdn, body, otp_length


def _parse_briq_otp_response(
    response: requests.Response,
    *,
    msisdn: str,
    otp_length: int,
    delivery_method: str,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
) -> dict[str, Any]:
    data: dict[str, Any] = {}
    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code == 402:
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error="SMS credits are low. Please contact your administrator.",
        )

    if response.ok and data.get("success"):
        expires = (data.get("data") or {}).get("expires_at")
        language = getattr(settings, "BRIQ_OTP_LANGUAGE", "en")
        channel_hint = build_channel_delivery_hint(
            delivery_method=delivery_method,
            language=language,
            quantity_bags=quantity_bags,
            fertilizer_type=fertilizer_type,
            farmer_name=farmer_name,
        )
        payload = _client_payload(
            delivered=True,
            phone_number=msisdn,
            expires_at=expires,
            otp_code_length=otp_length,
            delivery_method=delivery_method,
            message=channel_hint,
            briq_http_status=response.status_code,
            briq_api_message=data.get("message") or "",
            api_accepted=True,
        )
        if delivery_method == "sms":
            payload["handset_note"] = (
                "The SMS includes the bag count and fertilizer type. "
                "If nothing arrives within a minute, try Phone call or WhatsApp."
            )
        elif delivery_method == "whatsapp":
            payload["handset_note"] = (
                "WhatsApp uses Briq's approved OTP template. "
                "Ask the farmer to confirm the bag count shown on this screen."
            )
        return payload

    message = (
        data.get("message")
        or data.get("detail")
        or response.text[:300]
        or f"HTTP {response.status_code}"
    )
    return _client_payload(
        delivered=False,
        phone_number=msisdn,
        error=str(message),
        briq_http_status=response.status_code,
        briq_api_message=data.get("message") or str(message),
    )


def request_otp(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
    branch_name: str = "",
    batch_code: str = "",
    delivery_method: str = "sms",
) -> dict[str, Any]:
    """Request Briq to generate and deliver an OTP. Returns API-safe metadata (no code)."""
    api_key = getattr(settings, "BRIQ_API_KEY", "")
    app_key = getattr(settings, "BRIQ_APP_KEY", "")
    if not api_key or not app_key:
        return _client_payload(
            delivered=False,
            phone_number=normalize_phone_digits(phone_number),
            error="SMS verification is not configured.",
        )

    msisdn, body, otp_length = _otp_request_body(
        phone_number,
        quantity_bags=quantity_bags,
        fertilizer_type=fertilizer_type,
        farmer_name=farmer_name,
        branch_name=branch_name,
        batch_code=batch_code,
        delivery_method=delivery_method,
    )
    if not msisdn or len(msisdn) < 11:
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error="Invalid farmer phone number.",
        )

    timeout = int(getattr(settings, "BRIQ_REQUEST_TIMEOUT", 45))
    method = body["delivery_method"]
    started = time.monotonic()

    try:
        response = requests.post(
            f"{_base_url()}/v1/otp/request",
            headers=_api_headers(),
            json=body,
            timeout=timeout,
        )
        result = _parse_briq_otp_response(
            response,
            msisdn=msisdn,
            otp_length=otp_length,
            delivery_method=method,
            quantity_bags=quantity_bags,
            fertilizer_type=fertilizer_type,
            farmer_name=farmer_name,
        )
        result["briq_duration_ms"] = int((time.monotonic() - started) * 1000)
        logger.info(
            "[Briq] request otp to=%s method=%s http=%s delivered=%s duration_ms=%s api_msg=%s",
            msisdn,
            method,
            response.status_code,
            result.get("delivered"),
            result.get("briq_duration_ms"),
            result.get("briq_api_message") or result.get("error"),
        )
        return result
    except requests.Timeout:
        logger.warning("Briq OTP request timed out for %s", msisdn)
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error=(
                "Briq OTP request timed out. The SMS may still arrive — "
                "wait a moment and use Verify, or resend."
            ),
        )
    except requests.RequestException as exc:
        logger.exception("Briq OTP request failed")
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error=str(exc),
        )


def resend_otp(
    phone_number: str,
    *,
    quantity_bags: int | None = None,
    fertilizer_type: str = "",
    farmer_name: str = "",
    branch_name: str = "",
    batch_code: str = "",
    delivery_method: str = "sms",
) -> dict[str, Any]:
    """Resend the active Briq OTP (invalidates the previous code)."""
    api_key = getattr(settings, "BRIQ_API_KEY", "")
    app_key = getattr(settings, "BRIQ_APP_KEY", "")
    if not api_key or not app_key:
        return _client_payload(
            delivered=False,
            phone_number=normalize_phone_digits(phone_number),
            error="SMS verification is not configured.",
        )

    msisdn, body, otp_length = _otp_request_body(
        phone_number,
        quantity_bags=quantity_bags,
        fertilizer_type=fertilizer_type,
        farmer_name=farmer_name,
        branch_name=branch_name,
        batch_code=batch_code,
        delivery_method=delivery_method,
    )
    if not msisdn or len(msisdn) < 11:
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error="Invalid farmer phone number.",
        )

    timeout = int(getattr(settings, "BRIQ_REQUEST_TIMEOUT", 45))
    method = body["delivery_method"]
    started = time.monotonic()

    try:
        response = requests.post(
            f"{_base_url()}/v1/otp/resend",
            headers=_api_headers(),
            json=body,
            timeout=timeout,
        )
        result = _parse_briq_otp_response(
            response,
            msisdn=msisdn,
            otp_length=otp_length,
            delivery_method=method,
            quantity_bags=quantity_bags,
            fertilizer_type=fertilizer_type,
            farmer_name=farmer_name,
        )
        result["briq_duration_ms"] = int((time.monotonic() - started) * 1000)
        logger.info(
            "[Briq] resend otp to=%s method=%s http=%s delivered=%s duration_ms=%s api_msg=%s",
            msisdn,
            method,
            response.status_code,
            result.get("delivered"),
            result.get("briq_duration_ms"),
            result.get("briq_api_message") or result.get("error"),
        )
        return result
    except requests.Timeout:
        logger.warning("Briq OTP resend timed out for %s", msisdn)
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error="Briq OTP resend timed out. Wait a moment, then try again.",
        )
    except requests.RequestException as exc:
        logger.exception("Briq OTP resend failed")
        return _client_payload(
            delivered=False,
            phone_number=msisdn,
            error=str(exc),
        )


def verify_otp(phone_number: str, code: str) -> dict[str, Any]:
    """Verify a farmer-submitted code with Briq. Returns verified + error details."""
    api_key = getattr(settings, "BRIQ_API_KEY", "")
    app_key = getattr(settings, "BRIQ_APP_KEY", "")
    msisdn = normalize_phone_digits(phone_number)
    clean_code = re.sub(r"\D", "", str(code or "").strip())

    if not api_key or not app_key:
        return {
            "verified": False,
            "error": "BRIQ_API_KEY and BRIQ_APP_KEY must be configured.",
            "remaining_attempts": 0,
        }

    try:
        response = requests.post(
            f"{_base_url()}/v1/otp/verify",
            headers=_api_headers(),
            json={
                "phone_number": msisdn,
                "app_key": app_key,
                "code": clean_code,
            },
            timeout=int(getattr(settings, "BRIQ_REQUEST_TIMEOUT", 45)),
        )
        data = response.json() if response.content else {}
    except requests.RequestException as exc:
        logger.exception("Briq OTP verify failed")
        return {
            "verified": False,
            "error": str(exc),
            "remaining_attempts": None,
        }

    if data.get("success"):
        return {
            "verified": True,
            "verified_at": (data.get("data") or {}).get("verified_at"),
            "remaining_attempts": 0,
        }

    extra = data.get("data") or {}
    message = data.get("message") or data.get("detail") or "OTP verification failed."
    remaining = extra.get("remaining_attempts")
    return {
        "verified": False,
        "error": message,
        "remaining_attempts": remaining,
        "locked": remaining == 0
        or "Max verification attempts" in message
        or message == "No valid OTP found",
    }
