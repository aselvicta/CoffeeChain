from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from supply_chain.models import Branch, Farmer, Supplier, Warehouse
from supply_chain.services.ministry_of_agriculture import fetch_farmers


class Command(BaseCommand):
    help = "Seed demo users, groups, and farmers."

    def handle(self, *args, **options):
        groups = {
            "Supplier": Group.objects.get_or_create(name="Supplier")[0],
            "Retailer": Group.objects.get_or_create(name="Retailer")[0],
            "Cooperative": Group.objects.get_or_create(name="Cooperative")[0],
            "Regulator": Group.objects.get_or_create(name="Regulator")[0],
        }

        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@coffeechain.go.tz", "is_staff": True, "is_superuser": True},
        )
        admin_user.set_password("demo123")
        admin_user.save()

        supplier1 = User.objects.get_or_create(username="supplier1")[0]
        supplier1.set_password("demo123")
        supplier1.save()
        supplier1.groups.add(groups["Supplier"])

        supplier2 = User.objects.get_or_create(username="supplier2")[0]
        supplier2.set_password("demo123")
        supplier2.save()
        supplier2.groups.add(groups["Supplier"])

        retailer1 = User.objects.get_or_create(username="retailer1")[0]
        retailer1.set_password("demo123")
        retailer1.save()
        retailer1.groups.add(groups["Retailer"])

        retailer2 = User.objects.get_or_create(username="retailer2")[0]
        retailer2.set_password("demo123")
        retailer2.save()
        retailer2.groups.add(groups["Retailer"])

        coop1 = User.objects.get_or_create(username="cooperative1")[0]
        coop1.set_password("demo123")
        coop1.save()
        coop1.groups.add(groups["Cooperative"])

        coop2 = User.objects.get_or_create(username="cooperative2")[0]
        coop2.set_password("demo123")
        coop2.save()
        coop2.groups.add(groups["Cooperative"])

        coop3 = User.objects.get_or_create(username="cooperative3")[0]
        coop3.set_password("demo123")
        coop3.save()
        coop3.groups.add(groups["Cooperative"])

        regulator = User.objects.get_or_create(username="regulator1")[0]
        regulator.set_password("demo123")
        regulator.save()
        regulator.groups.add(groups["Regulator"])

        supplier_a, _ = Supplier.objects.get_or_create(
            name="Mbeya Fertilizers Ltd", defaults={"user": supplier1, "region": "Mbeya"}
        )
        Supplier.objects.get_or_create(
            name="Tanzania Agricultural Inputs", defaults={"user": supplier2, "region": "Dar es Salaam"}
        )

        Warehouse.objects.get_or_create(
            name="Main Warehouse",
            section="A1",
            defaults={"capacity_bags": 5000, "current_bags": 0},
        )
        Warehouse.objects.get_or_create(
            name="Cold Storage",
            section="B2",
            defaults={"capacity_bags": 2000, "current_bags": 0},
        )

        retailer_a, _ = Branch.objects.get_or_create(
            name="Bukoba Agro Shop",
            branch_type=Branch.RETAILER,
            defaults={"district": "Bukoba", "region": "Kagera", "user": retailer1},
        )
        Branch.objects.get_or_create(
            name="Kagera Farm Supplies",
            branch_type=Branch.RETAILER,
            defaults={"district": "Bukoba", "region": "Kagera", "user": retailer2},
        )
        coop_a, _ = Branch.objects.get_or_create(
            name="Bukoba Coffee Farmers AMCOS",
            branch_type=Branch.COOPERATIVE,
            defaults={"district": "Bukoba", "region": "Kagera", "user": coop1},
        )
        Branch.objects.get_or_create(
            name="Karagwe Coffee Union",
            branch_type=Branch.COOPERATIVE,
            defaults={"district": "Karagwe", "region": "Kagera", "user": coop2},
        )
        Branch.objects.get_or_create(
            name="Muleba Growers Society",
            branch_type=Branch.COOPERATIVE,
            defaults={"district": "Muleba", "region": "Kagera", "user": coop3},
        )

        farmer_records = fetch_farmers()
        cooperative_cache: dict[str, Branch] = {}
        created = 0
        updated = 0

        for record in farmer_records:
            cooperative = None
            coop_name = record.cooperative_name
            if coop_name:
                if coop_name not in cooperative_cache:
                    cooperative_cache[coop_name], _ = Branch.objects.get_or_create(
                        name=coop_name,
                        branch_type=Branch.COOPERATIVE,
                        defaults={
                            "district": record.district,
                            "region": record.region,
                        },
                    )
                cooperative = cooperative_cache[coop_name]

            _, was_created = Farmer.objects.update_or_create(
                ministry_id=record.ministry_id,
                defaults={
                    "name": record.name,
                    "phone_number": record.phone_number,
                    "district": record.district,
                    "cooperative": cooperative,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo data seeded. Farmers created: {created}, updated: {updated}."
            )
        )
