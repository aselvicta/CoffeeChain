"""SMS gateway with pluggable providers.

Selection is driven by ``settings.SMS_PROVIDER``:

- ``simulated`` (default): never makes a network call. Logs the message and
  returns the code in the response so demo and dev flows can complete.
- ``africas_talking``: posts to https://api.africastalking.com/version1/messaging.
  Requires ``AT_USERNAME`` and ``AT_API_KEY`` (and optionally ``AT_SENDER_ID``).
- ``twilio``: uses the Twilio REST API. Requires ``TWILIO_ACCOUNT_SID``,
  ``TWILIO_AUTH_TOKEN`` and ``TWILIO_FROM_NUMBER``.

All providers return a dict with at least ``provider``, ``delivered`` (bool),
``phone_number``, and ``message`` keys. Failures are caught and reported via
``delivered=False`` plus an ``error`` field so the calling view can degrade
gracefully without surfacing a 500 to the user.
"""

from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


def _normalize_msisdn(phone_number: str) -> str:
    """Best-effort E.164 conversion for Tanzania numbers."""
    raw = (phone_number or "").strip().replace(" ", "").replace("-", "")
    if not raw:
        return raw
    if raw.startswith("+"):
        return raw
    if raw.startswith("00"):
        return "+" + raw[2:]
    if raw.startswith("0") and len(raw) >= 9:
        return "+255" + raw[1:]
    if raw.startswith("255"):
        return "+" + raw
    return raw


def _send_simulated(phone_number: str, message: str, code: str) -> dict[str, Any]:
    logger.info("[SMS-SIM] To %s: %s", phone_number, message)
    return {
        "provider": "simulated",
        "delivered": True,
        "phone_number": phone_number,
        "message": message,
        "code_preview": code,
        "note": "Simulated mode. Configure SMS_PROVIDER to send real messages.",
    }


def _send_africas_talking(
    phone_number: str, message: str, code: str
) -> dict[str, Any]:
    username = getattr(settings, "AT_USERNAME", "")
    api_key = getattr(settings, "AT_API_KEY", "")
    sender_id = getattr(settings, "AT_SENDER_ID", "")
    base_url = getattr(
        settings,
        "AT_BASE_URL",
        "https://api.africastalking.com/version1/messaging",
    )
    if not username or not api_key:
        return {
            "provider": "africas_talking",
            "delivered": False,
            "phone_number": phone_number,
            "message": message,
            "error": "AT_USERNAME and AT_API_KEY must be configured.",
        }

    payload = {
        "username": username,
        "to": phone_number,
        "message": message,
    }
    if sender_id:
        payload["from"] = sender_id

    try:
        response = requests.post(
            base_url,
            data=payload,
            headers={
                "apiKey": api_key,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            timeout=15,
        )
        response.raise_for_status()
        body = response.json()
        recipients = body.get("SMSMessageData", {}).get("Recipients") or []
        first = recipients[0] if recipients else {}
        status_text = (first.get("status") or "").lower()
        delivered = status_text in {"success", "sent", "queued"}
        return {
            "provider": "africas_talking",
            "delivered": delivered,
            "phone_number": phone_number,
            "message": message,
            "raw": body,
            **({"error": first.get("status")} if not delivered else {}),
        }
    except requests.RequestException as exc:
        logger.exception("Africa's Talking send failed")
        return {
            "provider": "africas_talking",
            "delivered": False,
            "phone_number": phone_number,
            "message": message,
            "error": str(exc),
        }


def _send_twilio(phone_number: str, message: str, code: str) -> dict[str, Any]:
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not sid or not token or not from_number:
        return {
            "provider": "twilio",
            "delivered": False,
            "phone_number": phone_number,
            "message": message,
            "error": (
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER "
                "must be configured."
            ),
        }
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    try:
        response = requests.post(
            url,
            data={"From": from_number, "To": phone_number, "Body": message},
            auth=(sid, token),
            timeout=15,
        )
        response.raise_for_status()
        body = response.json()
        delivered = (body.get("status") or "").lower() not in {"failed", "undelivered"}
        return {
            "provider": "twilio",
            "delivered": delivered,
            "phone_number": phone_number,
            "message": message,
            "raw": body,
            **({"error": body.get("error_message")} if not delivered else {}),
        }
    except requests.RequestException as exc:
        logger.exception("Twilio send failed")
        return {
            "provider": "twilio",
            "delivered": False,
            "phone_number": phone_number,
            "message": message,
            "error": str(exc),
        }


PROVIDERS = {
    "simulated": _send_simulated,
    "africas_talking": _send_africas_talking,
    "twilio": _send_twilio,
}


def send_otp_sms(phone_number: str, code: str) -> dict[str, Any]:
    """Send an OTP via the configured SMS provider.

    Never raises: returns a dict with ``delivered=False`` and an ``error`` if
    the underlying provider fails, so OTP verification can proceed even if
    delivery has issues (the cooperative agent can still input the code).
    """
    msisdn = _normalize_msisdn(phone_number)
    message = (
        f"CoffeeChain verification code: {code}. "
        f"Share with your AMCOS agent to confirm fertilizer delivery."
    )
    provider_name = (getattr(settings, "SMS_PROVIDER", "simulated") or "simulated").lower()
    handler = PROVIDERS.get(provider_name, _send_simulated)
    return handler(msisdn, message, code)
