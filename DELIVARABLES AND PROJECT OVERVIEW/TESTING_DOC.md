Chapter Seven — Testing and Verification
Date: 2026-06-01

Purpose
-------
This chapter documents the testing strategy, responsibilities, and concrete test cases to verify that the CoffeeChain platform meets functional, integration, security, and operational expectations. It maps components to expected deliverables, acceptance criteria, test data, and suggested automation.

Scope
-----
- Backend: Django `supply_chain` app (models, views, serializers, services).
- Frontend: Vite + React UI under `frontend/src/app` (critical components only).
- Integrations: Storacha/IPFS, Polygon anchoring, SMS providers (simulated / Africa's Talking / Twilio).
- Operational: database migrations, backups, performance, and resilience tests.

Test Strategy (Levels)
----------------------
- Unit tests: validate pure functions, model helpers, serializers, and service utilities.
- Integration tests: validate interactions between Django views, services (IPFS, blockchain adapter, SMS), and DB.
- End-to-end (E2E) tests: full flows from UI to backend for core scenarios (dispatch → receive → OTP verification → receipt anchoring).
- Manual acceptance tests: human-verified steps for edge cases, hardware, or external provider verification.
- Security & performance: static scans, dependency checks, and load tests for key endpoints.

Test Environment and Data
-------------------------
- Dedicated test environment mirroring production env vars (STORACHA_UPLOAD_URL, SMS_PROVIDER, POLYGON_*). Use sandbox provider credentials where available.
- Use an isolated test database (Sqlite for CI, Postgres for staging tests).
- Fixtures / seed data: suppliers, branches, warehouses, a sample `farmers.csv`, fertilizer batches, and receipt files under `data/` and `data/test-fixtures/`.
- Local media receipts: use `media/receipts/*.json` as canonical payloads for anchoring tests.

How to run tests (recommended commands)
---------------------------------------
Activate backend venv and run tests (example):

```bash
source backend/.venv/Scripts/activate
cd backend
# If using pytest
pytest -q
# Fallback: Django test runner
python manage.py test
```

Component Tests
---------------

1) Models
- Objective: Ensure business rules and computed fields are correct.
- Targets: `FertilizerBatch.save()`, `Transfer.clean()`, `Warehouse` capacity recalculation, `OTPVerification` expiry logic.
- Unit tests:
  - Create `FertilizerBatch` with `bags` and `bag_weight_kg` and assert `quantity_tons` computed correctly.
  - Create `Transfer` invalid combinations (e.g., from supplier to farmer) and assert `ValidationError`.
  - Simulate warehouse inventory updates and assert capacity violations are prevented.
- Acceptance: All assertions pass; migrations do not alter logic unexpectedly.

2) Serializers
- Objective: Validate validation, create/update flows, and nested representations.
- Targets: Batch serializers, Transfer serializers, Farmer serializer with `fetch_farmer` fallback.
- Tests:
  - Feed invalid data and assert `is_valid()` returns False with expected error keys.
  - Post-valid payload and assert created object fields match payload and side-effects (e.g., stock changes).

3) Views / ViewSets (API)
- Objective: Ensure endpoints enforce permissions, trigger services, and manage state transitions.
- Targets: `TransferViewSet` (create, receive, send_otp, verify_otp), `FertilizerBatchViewSet`, `WarehouseCatalogView`.
- Integration tests:
  - Create transfer via API and assert DB state and notifications created.
  - Call `send_otp` and assert `OTPVerification` created and SMS service called (mock provider).
  - Call `verify_otp` with correct code and assert `_record_verification_proof` invoked (mock `store_json` and `anchor_to_polygon`) and `BlockchainAnchor` created.
- Acceptance: Endpoints return expected HTTP codes; side-effects recorded in DB; external calls are mocked in unit-level CI tests.

4) Services
- IPFS/Storacha (`services/ipfs.py`)
  - Unit tests: mock external HTTP POST to STORACHA_UPLOAD_URL and assert `StorageResult` parsing for success and failure.
  - Integration test: exercise fallback path — simulate Storacha failure and verify JSON written to `media/receipts` with pseudo-CID.
- Blockchain adapter (`services/blockchain.py`)
  - Unit tests: verify `build_hash()` produces deterministic SHA256 for sample payload.
  - Integration test (staging): call `anchor_to_polygon()` in sandbox and assert transaction id and block reference recorded. If no sandbox, mock the adapter.
- SMS (`services/sms.py`) & OTP (`services/otp.py`)
  - Unit tests: ensure normalization `_normalize_msisdn()` behaves for Tanzania numbers; OTP generation length/expiry rules.
  - Integration: with simulated provider, assert message payload contains code and receiver; with external providers, use their sandbox APIs.

5) Frontend
- Objective: Verify component logic, form validation, and E2E flows.
- Targets: `farmer-otp-modal`, `batch-dispatch`, `receive-fertilizer-panel`, `audit-trail` components.
- Tests:
  - Unit: React component snapshot tests and event handler assertions using Jest + React Testing Library.
  - Integration/E2E: Use Playwright or Cypress to run scenarios: login as user → create transfer → open OTP modal → verify code → upload proof. Use mocked backend in unit tests and a real test backend for E2E.

End-to-End (E2E) Test Matrix
---------------------------
- Happy path: Supplier creates batch → Dispatch to branch → Branch receives → Send OTP → Verify OTP → Upload proof → Receipt anchored.
- Error paths: OTP wrong/expired; Storacha upload fails (fallback used); insufficient warehouse capacity; invalid transfer types.
- Metrics: measure response times and success rates; assert anchoring completes within expected window (configured SLA).

Manual Acceptance Tests
----------------------
- Run through key flows with real devices (SMS delivery) and real polygon sandbox where available.
- Verify email notifications and UI display of receipt CID and anchor metadata.

Security and Penetration Checks
-------------------------------
- Run dependency checks (e.g., `pip-audit`), static analysis (Bandit), and SAST tools.
- Test file upload boundaries, content-type checks, and storage path traversal.

Performance and Load
--------------------
- Load test upload endpoints and verify behaviour under concurrent receipts (use locust or k6).
- Stress test OTP rate-limits and anchoring queue to assess backpressure handling.

Continuous Integration Recommendations
-------------------------------------
- Add `pytest` with coverage reporting to CI.
- Run unit tests and linters on each merge request; run integration suite on staging branch.
- Use service mocks for external integrations during unit-level CI; run a smaller integration matrix nightly against staging with sandbox credentials.

Test Ownership and Acceptance Criteria
-------------------------------------
- Owner: Backend team for server components; Frontend team for UI tests; DevOps for infra and performance tests.
- Acceptance: All critical-path unit tests passing in CI, integration tests for anchoring and IPFS fallback green on staging, and successful E2E run for the happy path before release.

Appendix A — Example Test Cases (condensed)
------------------------------------------
- TC-01: `FertilizerBatch` quantity calculation — creates batch with 100 bags × 50kg → expect 5.0 tons.
- TC-02: `Transfer` invalid route — attempt supplier→farmer direct → expect 400 with validation error.
- TC-03: OTP lifecycle — send OTP → verify with correct code → expect `BlockchainAnchor` record.
- TC-04: Storacha failure fallback — simulate 500 response → expect file in `media/receipts` and `is_remote=False` in result.

Appendix B — Recommended Fixtures
--------------------------------
- `data/test-fixtures/farmers.csv`
- `data/test-fixtures/sample_receipt.json`
- `tests/fixtures/users.yaml` (admin/supplier/branch accounts)

Next Steps
----------
- I can: (1) scaffold `tests/` with example unit tests for the backend, (2) add a Playwright E2E scaffold, or (3) generate CI pipeline snippets. Which would you like me to do next?
