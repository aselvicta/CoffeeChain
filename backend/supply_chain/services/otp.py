import random
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .sms import send_otp_sms


def generate_code():
    digits = [str(random.randint(0, 9)) for _ in range(settings.OTP_CODE_LENGTH)]
    return "".join(digits)


def is_expired(sent_at):
    return timezone.now() > sent_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)


def send_sms(phone_number, code):
    """Dispatch an OTP through the configured SMS provider."""
    return send_otp_sms(phone_number, code)
