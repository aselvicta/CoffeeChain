# What's Done — Demonstrable Features

This document lists the functionality you can demonstrate today, grouped by role.

## Admin
- Login: `POST /api/login/` (demo password: `demo123`). Demo admin user exists.
- Create and list users (admin user management endpoints).
- Create and manage `Supplier` and `Branch` records.
- View audit logs and audit report: `GET /api/audit-logs/`, `GET /api/reports/audit/`.

## Supplier
- Create and manage fertilizer batches: `GET/POST /api/batches/`.
- Create warehouses (supplier or admin): `GET/POST /api/warehouses/`.
- Dispatch stock to branches: `POST /api/transfers/` (transfer_type `SUPPLIER_TO_BRANCH`).
- View warehouse catalog: `GET /api/warehouse-catalog/`.

## Cooperative (Branch)
- View inbound dispatches and all transfers: `GET /api/transfers/`.
- Mark dispatch as received: `POST /api/transfers/{id}/receive/`.
- Register farmers from Ministry registry: `GET /api/farmers/lookup?ministry_id=...` and `POST /api/farmers/register/`.
- Distribute to farmers: `POST /api/transfers/` (transfer_type `BRANCH_TO_FARMER`).
- Send OTP to farmer and verify delivery: `POST /api/transfers/{id}/send_otp/` and `POST /api/transfers/{id}/verify_otp/`.
- Upload delivery proof (photo/receipt): `POST /api/transfers/{id}/upload_proof/`.
- Receive in-app notifications when dispatches arrive.

## Retailer
- Retailer branches can view inbound dispatches and mark receive (similar to cooperative) via the transfers endpoints.

## Regulator
- View audit logs and anchored verification artifacts: `GET /api/audit-logs/`, `GET /api/reports/audit/`.

## Farmer (records)
- Farmers are managed as records (cooperatives register them using Ministry data).
- OTP-based delivery verification uses the farmer phone number (simulated SMS by default).

## System / Integrations
- Authentication: `POST /api/login/` — demo credentials seeded (`admin`, `supplier1`, `supplier2`, `retailer1`, `retailer2`, `cooperative1`, `cooperative2`, `cooperative3`, `regulator1`).
- SMS: simulated provider by default; `send_otp` returns a preview so demos can show the code without external SMS setup.
- Receipt storage: attempts upload to Storacha (configured by `STORACHA_UPLOAD_URL`); when unavailable, receipts are written to `media/receipts/` with a pseudo-CID so verification still works offline.
- Blockchain anchoring: code exists to anchor receipts on Polygon (via contract in `smart-contracts/`), but requires environment variables (`POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `POLYGON_CONTRACT_ADDRESS`) to be configured — anchor failures do not block OTP verification.

## Demo helpers
- Seeded demo data and demo users via management command: `python manage.py seed_demo` (see `backend/README.md`).
- End-to-end smoke test script demonstrating supplier → cooperative receive → farmer distribution → OTP verify: `backend/scripts/smoke_test_chain.py`.

## Quick demo steps
1. Start the backend (from `backend/`):

   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_demo
   python manage.py runserver

2. Login as `cooperative1` (password `demo123`) and demonstrate:
   - View inbound transfers (`GET /api/transfers/`).
   - Receive a dispatched transfer (`POST /api/transfers/{id}/receive/`).
   - Distribute to a farmer and run OTP flows (`send_otp`, `verify_otp`).

3. Show `admin` operations and audit reports (`GET /api/reports/audit/`).

## Notes / Caveats
- SMS is simulated by default — OTP codes are visible in the provider response for demo convenience.
- Storacha and Polygon integrations require configuration; when not configured the system falls back to local storage and logs, and verification still completes.

References: see [backend/README.md](backend/README.md) and [backend/scripts/smoke_test_chain.py](backend/scripts/smoke_test_chain.py) for runnable instructions and a scripted demo.
