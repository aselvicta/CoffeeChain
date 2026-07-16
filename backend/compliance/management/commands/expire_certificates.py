from django.core.management.base import BaseCommand

from compliance.services import expire_due_certificates


class Command(BaseCommand):
    help = "Mark verified organisation certificates as expired when past expires_on."

    def handle(self, *args, **options):
        count = expire_due_certificates()
        self.stdout.write(self.style.SUCCESS(f"Expired {count} organisation certificate(s)."))
