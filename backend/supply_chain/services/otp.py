import random
from datetime import timedelta

from django.conf import settings
from django.utils import timezone


def generate_code():
    digits = [str(random.randint(0, 9)) for _ in range(settings.OTP_CODE_LENGTH)]
    return "".join(digits)


def is_expired(sent_at):
    return timezone.now() > sent_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
