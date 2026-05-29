"""Smoke test: supplier -> cooperative receive -> farmer distribute -> OTP verify."""
import os
import sys
from pathlib import Path

import django
import requests

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "coffeechain.settings")
django.setup()

BASE = "http://127.0.0.1:8000"


def login(username):
    r = requests.post(f"{BASE}/api/login/", json={"username": username, "password": "demo123"})
    r.raise_for_status()
    return r.json()["access"]


def api(token, method, path, **kwargs):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.request(method, f"{BASE}{path}", headers=headers, **kwargs)
    return r


def main():
    errors = []

    # 1. Supplier catalog has stock
    supplier_token = login("supplier1")
    cat = api(supplier_token, "GET", "/api/warehouse-catalog/").json()
    if not cat or not any(w.get("available_bags", 0) > 0 for w in cat):
        errors.append("Warehouse catalog empty or no available bags")
    print("Catalog warehouses:", len(cat))

    # 2. Cooperative sees inbound + can receive pending
    coop_token = login("cooperative1")
    me = api(coop_token, "GET", "/api/me/").json()
    branch_id = me["branch"]["id"]
    transfers = api(coop_token, "GET", "/api/transfers/").json()
    inbound = [
        t
        for t in transfers
        if t["transfer_type"] == "SUPPLIER_TO_BRANCH" and t["to_branch"]["id"] == branch_id
    ]
    pending = [t for t in inbound if t["status"] == "DISPATCHED"]
    received = [t for t in inbound if t["status"] in ("RECEIVED", "VERIFIED")]
    print(f"Inbound: {len(inbound)} (pending={len(pending)}, received={len(received)})")

    if pending:
        r = api(coop_token, "POST", f"/api/transfers/{pending[0]['id']}/receive/")
        if r.status_code != 200:
            errors.append(f"Receive failed: {r.status_code} {r.text}")
        else:
            print(f"Received transfer #{pending[0]['id']}")

    # Refresh received batches
    transfers = api(coop_token, "GET", "/api/transfers/").json()
    received = [
        t
        for t in transfers
        if t["transfer_type"] == "SUPPLIER_TO_BRANCH"
        and t["to_branch"]["id"] == branch_id
        and t["status"] in ("RECEIVED", "VERIFIED")
    ]
    if not received:
        errors.append("No received batches for cooperative")

    farmers = api(coop_token, "GET", "/api/farmers/").json()
    victor = next((f for f in farmers if f.get("ministry_id") == "MOA-KAG-031"), farmers[0] if farmers else None)
    if not victor:
        errors.append("No farmers for cooperative")

    best = None
    if received and victor:
        from supply_chain.models import Branch, FertilizerBatch
        from supply_chain.views import get_branch_available_quantity

        branch = Branch.objects.get(id=branch_id)
        for t in received:
            batch = FertilizerBatch.objects.get(id=t["batch"]["id"])
            avail = get_branch_available_quantity(batch, branch)
            if avail > 0 and (not best or avail > best[1]):
                best = (t, avail)
        if not best:
            errors.append("No batches with remaining stock at branch")
        else:
            batch_id = best[0]["batch"]["id"]
            print(f"Using batch {batch_id} with {best[1]} bags available")
            r = api(
                coop_token,
                "POST",
                "/api/transfers/",
                json={
                    "batch_id": batch_id,
                    "transfer_type": "BRANCH_TO_FARMER",
                    "from_branch_id": branch_id,
                    "farmer_id": victor["id"],
                    "quantity_bags": 5,
                    "status": "DISPATCHED",
                },
            )
            if r.status_code not in (200, 201):
                errors.append(f"Farmer distribute failed: {r.status_code} {r.text}")
            else:
                dist = r.json()
                print(f"Farmer distribution #{dist['id']} created")

                otp_r = api(coop_token, "POST", f"/api/transfers/{dist['id']}/send_otp/")
                if otp_r.status_code != 200:
                    errors.append(f"send_otp failed: {otp_r.status_code}")
                else:
                    from supply_chain.models import OTPVerification

                    code = OTPVerification.objects.get(transfer_id=dist["id"]).code
                    verify_r = api(
                        coop_token,
                        "POST",
                        f"/api/transfers/{dist['id']}/verify_otp/",
                        json={"code": code},
                    )
                    if verify_r.status_code != 200:
                        errors.append(f"verify_otp failed: {verify_r.status_code} {verify_r.text[:200]}")
                    else:
                        body = verify_r.json()
                        print(
                            "Verified:",
                            body.get("transfer", {}).get("status"),
                            "anchor:",
                            bool(body.get("verification")),
                        )

    # 3. Over-distribution should fail
    if best and victor:
        batch_id = best[0]["batch"]["id"]
        r = api(
            coop_token,
            "POST",
            "/api/transfers/",
            json={
                "batch_id": batch_id,
                "transfer_type": "BRANCH_TO_FARMER",
                "from_branch_id": branch_id,
                "farmer_id": victor["id"],
                "quantity_bags": 99999,
                "status": "DISPATCHED",
            },
        )
        if r.status_code == 201:
            errors.append("Over-distribution should have been rejected")
        else:
            print("Stock guard OK:", r.status_code)

    if errors:
        print("FAILURES:")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("All chain smoke tests passed.")


if __name__ == "__main__":
    main()
