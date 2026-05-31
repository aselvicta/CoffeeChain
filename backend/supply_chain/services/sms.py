"""SMS gateway with pluggable providers.

Selection is driven by ``settings.SMS_PROVIDER``:

- ``simulated``: never makes a network call. Logs the message and returns a demo
  code in the API response for local development without credentials.
- ``twilio`` (recommended): Twilio Programmable SMS. Requires ``TWILIO_ACCOUNT_SID``,
  ``TWILIO_AUTH_TOKEN`` and ``TWILIO_FROM_NUMBER``. Trial accounts can SMS verified
  test numbers — see https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- ``africas_talking``: legacy provider; sandbox does not deliver to real handsets.

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

_TWILIO_VERIFY_URL = (
    "https://console.twilio.com/us1/develop/phone-numbers/manage/verified"
)
_TWILIO_TRIAL_HINT = (
    "Twilio trial accounts can only SMS numbers verified in the Twilio console. "
    "Add the farmer number under Verified Caller IDs, then resend OTP."
)
_TWILIO_VIRTUAL_PHONE_HINT = (
    "Twilio trial cannot SMS Tanzania (+255) from a US number. The OTP was sent to "
    "the Twilio Virtual Phone inbox instead — open the console link below, click "
    "Virtual Phone, and read the message there."
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
        note="Simulated mode. Set SMS_PROVIDER=africas_talking and AT credentials for real SMS.",
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
            if username_lower == "sandbox":
                hint = (
                    " Use a Sandbox API key from sandbox.africastalking.com with "
                    "username 'sandbox' and AT_BASE_URL pointing to the sandbox API."
                )
            else:
                hint = (
                    f" Check that AT_USERNAME matches your live app name on "
                    "africastalking.com, regenerate the API key for that app, and "
                    "use the production URL. New keys can take a few minutes to activate."
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


def _twilio_error_detail(exc: requests.HTTPError) -> tuple[str, str]:
    """Return (message, error_code) from a Twilio REST error response."""
    if exc.response is None:
        return str(exc), ""
    try:
        body = exc.response.json()
        return (body.get("message") or "").strip(), str(body.get("code") or "")
    except ValueError:
        return (exc.response.text or str(exc)).strip()[:400], ""


def _twilio_post_message(
    *,
    sid: str,
    token: str,
    from_number: str,
    to_number: str,
    body: str,
) -> dict[str, Any]:
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    response = requests.post(
        url,
        data={"From": from_number, "To": to_number, "Body": body},
        auth=(sid, token),
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def _twilio_failure_payload(
    phone_number: str, exc: requests.HTTPError
) -> dict[str, Any]:
    detail, error_code = _twilio_error_detail(exc)
    logger.warning(
        "Twilio HTTP %s code=%s: %s",
        exc.response.status_code if exc.response else "?",
        error_code,
        detail,
    )
    trial_codes = {"21610", "21608", "21408"}
    invalid_to_codes = {"21211", "21265", "21614"}
    geo_codes = {"21612", "21408"}
    extra: dict[str, Any] = {}
    if error_code in trial_codes or "unverified" in detail.lower():
        extra["trial_mode"] = True
        extra["verify_url"] = _TWILIO_VERIFY_URL
        extra["note"] = _TWILIO_TRIAL_HINT
        extra["user_message"] = _TWILIO_TRIAL_HINT
    elif error_code in geo_codes or "combination of" in detail.lower():
        extra["international_trial_blocked"] = True
        if "1877780" in detail or "virtual" in detail.lower():
            extra["user_message"] = (
                "Enable United States (and Tanzania if needed) under Twilio Console → "
                "Messaging → Settings → Geo permissions, then resend OTP."
            )
        else:
            extra["user_message"] = (
                "Twilio trial (US account) cannot send SMS to Tanzania (+255). "
                "Set TWILIO_TRIAL_DESTINATION=virtual_phone in backend/.env to use the "
                "Twilio Virtual Phone inbox, or upgrade Twilio / use Africa's Talking live."
            )
        extra["note"] = extra["user_message"]
    elif error_code in invalid_to_codes:
        extra["note"] = (
            "Use the farmer number in international format, e.g. +255712345678."
        )
    return _client_payload(
        "twilio",
        delivered=False,
        phone_number=phone_number,
        error=detail or str(exc),
        **extra,
    )


def _virtual_phone_message(farmer_msisdn: str, code: str) -> str:
    return (
        f"CoffeeChain verification for farmer {farmer_msisdn}: {code}. "
        f"Share this code with your AMCOS agent to confirm fertilizer delivery. "
        f"(Twilio trial — shown in Virtual Phone, not on the farmer handset.)"
    )


def _send_twilio_virtual_phone(
    farmer_msisdn: str,
    code: str,
    *,
    sid: str,
    token: str,
    from_number: str,
    virtual_phone: str,
) -> dict[str, Any]:
    console_url = getattr(
        settings,
        "TWILIO_VIRTUAL_PHONE_CONSOLE_URL",
        "https://console.twilio.com/us1/develop/sms/try-it-out/send",
    )
    body = _virtual_phone_message(farmer_msisdn, code)
    try:
        result = _twilio_post_message(
            sid=sid,
            token=token,
            from_number=from_number,
            to_number=virtual_phone,
            body=body,
        )
        status = (result.get("status") or "").lower()
        delivered = status in {"queued", "accepted", "sending", "sent", "delivered"}
        logger.info(
            "[SMS-Twilio] Virtual Phone to %s for farmer %s status=%s",
            virtual_phone,
            farmer_msisdn,
            status,
        )
        return _client_payload(
            "twilio",
            delivered=delivered,
            phone_number=farmer_msisdn,
            error=result.get("error_message") or "" if not delivered else "",
            message_sid=result.get("sid") or "",
            virtual_phone_delivery=True,
            virtual_phone_to=virtual_phone,
            virtual_phone_console_url=console_url,
            message=_TWILIO_VIRTUAL_PHONE_HINT,
            user_message=_TWILIO_VIRTUAL_PHONE_HINT,
            note=_TWILIO_VIRTUAL_PHONE_HINT,
        )
    except requests.HTTPError as exc:
        payload = _twilio_failure_payload(farmer_msisdn, exc)
        payload["virtual_phone_attempted"] = virtual_phone
        return payload
    except requests.RequestException as exc:
        logger.exception("Twilio Virtual Phone send failed")
        return _client_payload(
            "twilio",
            delivered=False,
            phone_number=farmer_msisdn,
            error=str(exc),
        )


def _send_twilio(phone_number: str, message: str, code: str) -> dict[str, Any]:
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")
    virtual_phone = (getattr(settings, "TWILIO_VIRTUAL_PHONE", "") or "").strip()
    trial_destination = (
        getattr(settings, "TWILIO_TRIAL_DESTINATION", "virtual_phone") or "farmer"
    ).lower()

    if not sid or not token or not from_number:
        return _client_payload(
            "twilio",
            delivered=False,
            phone_number=phone_number,
            error=(
                "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER "
                "must be configured in backend/.env"
            ),
        )
    if not phone_number.startswith("+"):
        return _client_payload(
            "twilio",
            delivered=False,
            phone_number=phone_number,
            error=(
                f"Invalid phone format '{phone_number}'. Use E.164, e.g. +255712345678."
            ),
        )

    # Twilio trial quickstart: deliver to Virtual Phone (+18777804236) in the console.
    if trial_destination == "virtual_phone" and virtual_phone:
        return _send_twilio_virtual_phone(
            phone_number,
            code,
            sid=sid,
            token=token,
            from_number=from_number,
            virtual_phone=virtual_phone,
        )

    try:
        result = _twilio_post_message(
            sid=sid,
            token=token,
            from_number=from_number,
            to_number=phone_number,
            body=message,
        )
        status = (result.get("status") or "").lower()
        logger.info(
            "[SMS-Twilio] To %s status=%s sid=%s",
            phone_number,
            status,
            result.get("sid"),
        )
        delivered = status in {"queued", "accepted", "sending", "sent", "delivered"}
        error = ""
        if not delivered:
            error = result.get("error_message") or f"Unexpected status: {status}"
        return _client_payload(
            "twilio",
            delivered=delivered,
            phone_number=phone_number,
            error=error,
            message_sid=result.get("sid") or "",
        )
    except requests.HTTPError as exc:
        payload = _twilio_failure_payload(phone_number, exc)
        if payload.get("international_trial_blocked") and virtual_phone:
            logger.info(
                "[SMS-Twilio] +255 blocked; retrying via Virtual Phone %s",
                virtual_phone,
            )
            return _send_twilio_virtual_phone(
                phone_number,
                code,
                sid=sid,
                token=token,
                from_number=from_number,
                virtual_phone=virtual_phone,
            )
        return payload
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


def _attach_user_message(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("delivered"):
        payload.setdefault(
            "user_message",
            "Verification code sent by SMS. Ask the farmer to check their phone.",
        )
        return payload
    if not payload.get("user_message"):
        payload["user_message"] = (
            payload.get("note")
            or payload.get("error")
            or "SMS could not be delivered. Check backend logs and SMS provider settings."
        )
    return payload


def send_otp_sms(phone_number: str, code: str) -> dict[str, Any]:
    """Send an OTP via the configured SMS provider.

    Never raises: returns a dict with ``delivered=False`` and an ``error`` if
    the underlying provider fails. The cooperative UI should only open the OTP
    modal when ``delivered`` is true so the farmer receives the SMS first.
    """
    msisdn = _normalize_msisdn(phone_number)
    message = (
        f"CoffeeChain verification code: {code}. "
        f"Share with your AMCOS agent to confirm fertilizer delivery."
    )
    provider_name = (getattr(settings, "SMS_PROVIDER", "simulated") or "simulated").lower()
    handler = PROVIDERS.get(provider_name, _send_simulated)
    logger.info("[SMS] provider=%s to=%s", provider_name, msisdn)
    result = handler(msisdn, message, code)

    fallback = (
        getattr(settings, "SMS_FALLBACK_PROVIDER", "") or ""
    ).lower().strip()
    if (
        not result.get("delivered")
        and fallback
        and fallback != provider_name
        and fallback in PROVIDERS
    ):
        logger.info("[SMS] primary=%s failed; trying fallback=%s", provider_name, fallback)
        result = PROVIDERS[fallback](msisdn, message, code)
        result["fallback_from"] = provider_name

    return _attach_user_message(result)
