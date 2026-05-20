import random
from datetime import timedelta

from django.conf import settings
from django.utils import timezone


def generate_code():
    digits = [str(random.randint(0, 9)) for _ in range(settings.OTP_CODE_LENGTH)]
    return "".join(digits)


def is_expired(sent_at):
    return timezone.now() > sent_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)


def send_sms(phone_number, code):
    # Placeholder for SMS gateway integration (Twilio, Africa's Talking, local gateways).
    # For now, return payload so UI can display a simulated SMS message.
    return {
        "phone_number": phone_number,
        "message": f"Your fertilizer delivery code is {code}",
    }
