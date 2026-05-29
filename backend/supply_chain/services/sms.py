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

_CLIENT_HINT = (
    "A verification code was sent by SMS. Ask the farmer to check their phone."
)

_AT_SANDBOX_HINT = (
    "Africa's Talking sandbox accepted the message but does NOT deliver SMS to "
    "real phones. Open the simulator (link below), register this number, then "
    "read the OTP there — or switch to a live AT app for real handset delivery."
)

_AT_SANDBOX_SIMULATOR_URL = "https://simulator.africastalking.com:1517/"

_AT_SANDBOX_PHONE_HINT = (
    "Add this number under Africa's Talking Sandbox → Phone numbers, then resend."
)


def _client_payload(
    provider: str,
    *,
    delivered: bool,
    phone_number: str,
    code: str = "",
    error: str = "",
    code_preview: str = "",
    note: str = "",
    message: str = "",
    sandbox_mode: bool = False,
    api_accepted: bool = False,
    **extra: Any,
) -> dict[str, Any]:
    """Build API-safe SMS metadata — never includes the OTP in the message body."""
    payload: dict[str, Any] = {
        "provider": provider,
        "delivered": delivered,
        "phone_number": phone_number,
        "message": message or _CLIENT_HINT,
        "sandbox_mode": sandbox_mode,
        "api_accepted": api_accepted,
    }
    if error:
        payload["error"] = error
    if code_preview:
        payload["code_preview"] = code_preview
    if note:
        payload["note"] = note
    if sandbox_mode:
        payload["simulator_url"] = _AT_SANDBOX_SIMULATOR_URL
    payload.update(extra)
    return payload


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
    return _client_payload(
        "simulated",
        delivered=True,
        phone_number=phone_number,
        code_preview=code,
        note="Simulated mode. Configure SMS_PROVIDER=africas_talking for real SMS.",
    )


def _send_africas_talking(
    phone_number: str, message: str, code: str
) -> dict[str, Any]:
    username = getattr(settings, "AT_USERNAME", "")
    api_key = getattr(settings, "AT_API_KEY", "")
    sender_id = getattr(settings, "AT_SENDER_ID", "")
    username_lower = (username or "").lower()
    default_url = (
        "https://api.sandbox.africastalking.com/version1/messaging"
        if username_lower == "sandbox"
        else "https://api.africastalking.com/version1/messaging"
    )
    base_url = getattr(settings, "AT_BASE_URL", default_url)
    if not username or not api_key:
        return _client_payload(
            "africas_talking",
            delivered=False,
            phone_number=phone_number,
            error="AT_USERNAME and AT_API_KEY must be configured.",
        )

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
        logger.info("[SMS-AT] To %s status response: %s", phone_number, body)
        recipients = body.get("SMSMessageData", {}).get("Recipients") or []
        first = recipients[0] if recipients else {}
        status_text = (first.get("status") or "").lower()
        api_accepted = status_text in {"success", "sent", "queued"}
        is_sandbox = username_lower == "sandbox"
        error = ""
        if not api_accepted:
            status_label = first.get("status") or "failed"
            error = status_label
            if status_label == "InvalidPhoneNumber" and is_sandbox:
                error = f"{status_label}. {_AT_SANDBOX_PHONE_HINT}"
        if is_sandbox and api_accepted:
            return _client_payload(
                "africas_talking",
                delivered=False,
                phone_number=phone_number,
                sandbox_mode=True,
                api_accepted=True,
                message=_AT_SANDBOX_HINT,
                note=(
                    "Register the farmer number in the simulator, then resend OTP "
                    "and read the SMS in the simulator inbox."
                ),
            )
        return _client_payload(
            "africas_talking",
            delivered=api_accepted,
            phone_number=phone_number,
            api_accepted=api_accepted,
            error=error,
        )
    except requests.HTTPError as exc:
        detail = ""
        if exc.response is not None:
            detail = (exc.response.text or "").strip()[:300]
        logger.warning(
            "Africa's Talking HTTP %s: %s",
            exc.response.status_code if exc.response else "?",
            detail or exc,
        )
        hint = ""
        if exc.response is not None and exc.response.status_code == 401:
            hint = (
                " Use username 'sandbox' with a Sandbox API key from "
                "account.africastalking.com (not production). New keys can take "
                "5–20 minutes to activate."
            )
        return _client_payload(
            "africas_talking",
            delivered=False,
            phone_number=phone_number,
            error=f"{detail or exc}{hint}",
        )
    except requests.RequestException as exc:
        logger.exception("Africa's Talking send failed")
        return _client_payload(
            "africas_talking",
            delivered=False,
            phone_number=phone_number,
            error=str(exc),
        )


def _send_twilio(phone_number: str, message: str, code: str) -> dict[str, Any]:
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    if not sid or not token or not from_number:
        return _client_payload(
            "twilio",
            delivered=False,
            phone_number=phone_number,
            error=(
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER "
                "must be configured."
            ),
        )
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
        logger.info("[SMS-Twilio] To %s status: %s", phone_number, body.get("status"))
        delivered = (body.get("status") or "").lower() not in {"failed", "undelivered"}
        return _client_payload(
            "twilio",
            delivered=delivered,
            phone_number=phone_number,
            error=body.get("error_message") or "" if not delivered else "",
        )
    except requests.RequestException as exc:
        logger.exception("Twilio send failed")
        return _client_payload(
            "twilio",
            delivered=False,
            phone_number=phone_number,
            error=str(exc),
        )


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
    logger.info("[SMS] provider=%s to=%s", provider_name, msisdn)
    return handler(msisdn, message, code)
