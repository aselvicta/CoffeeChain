"""Test Briq Karibu OTP using backend/.env credentials.

Usage:
  python manage.py test_briq_otp 0745979712
  python manage.py test_briq_otp 0745979712 --method call
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from supply_chain.services.briq import (
    is_briq_provider,
    normalize_phone_digits,
    request_otp,
)


class Command(BaseCommand):
    help = "Send a test OTP through Briq and print the API result."

    def add_arguments(self, parser):
        parser.add_argument("phone", help="Farmer phone (e.g. 0745979712)")
        parser.add_argument(
            "--method",
            choices=["sms", "call", "whatsapp"],
            default=None,
            help="Delivery method (default: BRIQ_OTP_PRIMARY_METHOD from .env)",
        )

    def handle(self, *args, **options):
        if not is_briq_provider():
            self.stderr.write(self.style.ERROR("SMS_PROVIDER must be briq in backend/.env"))
            return

        phone = options["phone"]
        msisdn = normalize_phone_digits(phone)
        method = (options["method"] or settings.BRIQ_OTP_PRIMARY_METHOD or "sms").lower()

        self.stdout.write("=== Briq OTP configuration ===")
        self.stdout.write(f"  SMS_PROVIDER        = {settings.SMS_PROVIDER}")
        self.stdout.write(f"  BRIQ_BASE_URL       = {settings.BRIQ_BASE_URL}")
        self.stdout.write(f"  BRIQ_APP_KEY        = {settings.BRIQ_APP_KEY}")
        self.stdout.write(f"  BRIQ_API_KEY set    = {bool(settings.BRIQ_API_KEY)}")
        self.stdout.write(
            f"  BRIQ_OTP_SENDER_ID  = {settings.BRIQ_OTP_SENDER_ID or '(empty)'}"
        )
        self.stdout.write(f"  BRIQ_OTP_PRIMARY    = {settings.BRIQ_OTP_PRIMARY_METHOD}")
        self.stdout.write(f"  Normalized phone    = {msisdn} (digits only, no +)")
        self.stdout.write(f"  Test method         = {method}")
        self.stdout.write("")

        result = request_otp(phone, delivery_method=method)

        self.stdout.write("=== Briq API response ===")
        for key in sorted(result.keys()):
            self.stdout.write(f"  {key}: {result[key]}")

        if result.get("delivered"):
            self.stdout.write(
                self.style.SUCCESS("\nBriq API accepted the OTP request (HTTP success).")
            )
            self.stdout.write(
                "API success does NOT guarantee SMS on the handset. If no code arrives:\n"
                "  1. Run: python manage.py test_briq_otp YOUR_PHONE --method call\n"
                "  2. In karibu.briq.tz: check wallet credits + approved Sender ID\n"
                "  3. Match BRIQ_OTP_SENDER_ID exactly to your dashboard (or leave empty)"
            )
        else:
            self.stdout.write(self.style.ERROR("\nBriq rejected the request."))
            self.stdout.write(f"  error: {result.get('error')}")
