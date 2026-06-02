Chapter One — System Overview
Date: 2026-06-01

Purpose
-------
This chapter presents a concise, formal overview of the CoffeeChain platform re-scoped as a private B2B tracking and auditing service for agricultural inputs (fertilizers). It defines objectives, scope, stakeholders, high-level architecture, primary data flows, and acceptance criteria used across subsequent chapters.

Executive Summary
-----------------
CoffeeChain is a private-sector SaaS platform that provides traceability, auditability, and tamper-evident proof management for fertilizer supply chains. The platform records batch creation, movements between suppliers, branches and farmers, delivery proof uploads, and cryptographic anchoring of receipts to an external blockchain (Polygon). Off-chain payloads are stored on Storacha/IPFS with a robust local fallback.

Business Objectives
-------------------
- Provide end-to-end visibility of fertilizer batches from supplier to recipient.
- Enable tamper-evident proofing of deliveries via cryptographic hashing and blockchain anchoring.
- Reduce reconciliation disputes through OTP-based recipient verification and immutable receipts.
- Offer a private, configurable platform for partners and enterprises without government integration dependencies.

Scope
-----
In scope:
- Core domain: Suppliers, Branches, Warehouses, Fertilizer Batches, Transfers, Delivery Proofs.
- Core features: batch lifecycle, warehouse capacity enforcement, transfer workflows, OTP verification, receipt upload, Storacha/IPFS storage with local fallback, blockchain anchoring layer, audit logs and notifications.
Out of scope (for this phase):
- Government registry integrations and direct MOA data exchange (the platform uses a CSV-based dev registry and supports future connectors).
- Multi-tenant billing and tenant isolation beyond basic role scoping (planned future work).

Key Stakeholders and Users
--------------------------
- Platform Operators: manage system configuration, access control, and deployment.
- Supplier Admins: create batches, dispatch inventory to branches.
- Branch Operators: receive shipments, manage warehouses, deliver to farmers.
- Field Agents / Drivers: upload delivery proofs and trigger OTP verification.
- Farmers / Recipients: receive deliveries, verify via OTP, and access receipts.
- Auditors / Compliance Officers: review audit logs, anchors, and receipts for compliance.

High-level Architecture
-----------------------
- Backend: Django REST API (`backend/coffeechain` and `backend/supply_chain` app) managing domain logic, persistence, and service adapters.
- Frontend: Vite + React SPA (`frontend/src/app`) providing UI for dispatch, receiving, OTP flows, and audit views.
- Off-chain Storage: Storacha (primary) with IPFS-compatible interface; local filesystem fallback under `media/receipts/` for resilience.
- Blockchain Anchoring: Polygon adapter to submit data hashes as transactions; `BlockchainAnchor` records metadata.
- Messaging & OTP: Pluggable SMS providers (simulated, Africa's Talking, Twilio) with OTP lifecycle and verification logic.
- Data Store: Relational DB (development: SQLite; production: Postgres recommended) with migrations under `backend/supply_chain/migrations/`.

Primary Data Flows
------------------
1. Batch Creation: Supplier creates `FertilizerBatch` → persists batch metadata and inventory counts.
2. Dispatch: `Transfer` created from Supplier → Branch (capacity validated) → inventory decremented at source.
3. Delivery: Branch → Farmer transfer triggers `send_otp` to recipient.
4. Verification: Recipient provides OTP → `verify_otp` records `OTPVerification` and calls `_record_verification_proof`.
5. Proofing & Anchoring: `_record_verification_proof` calls `store_json` (Storacha/IPFS) to persist receipt payload; `build_hash` computes SHA256; `anchor_to_polygon` optionally anchors the hash and `BlockchainAnchor` saved.
6. Audit Trail: All state transitions and key actions are recorded in `AuditLog` for later reporting.

Security and Privacy Principles
-----------------------------
- Least privilege: Role-based access controls for APIs and UI features.
- Data minimization: Only required recipient and transfer data are stored in receipts.
- Resilience: Use of Storacha remote storage with local fallback ensures receipts are retained.
- Secrets & Config: Credentials (SMS, Storacha, Polygon) are environment variables; never commit to repo.
- Integrity: Anchoring adds tamper-evidence to critical receipts via hashing and blockchain transaction references.

Operational Assumptions
-----------------------
- SMS provider sandbox or production keys will be supplied for staging/production tests.
- Storacha or equivalent upload service is reachable; if not, local `media/receipts` will contain JSON receipts.
- Polygon anchoring requires a funded account or sandbox; anchoring can be mocked in CI and executed in staging.
- Background retries and job queues are desirable for production but may be absent in this phase.

Acceptance Criteria (Chapter-Level)
----------------------------------
- Core flows (create → dispatch → receive → verify → proof stored) complete end-to-end in staging with successful receipt persistence.
- OTP verification creates `BlockchainAnchor` entries when anchoring is enabled (or is mocked and recorded) and associated proof metadata is stored.
- Storacha upload success and fallback to local receipt path must be demonstrable via tests in TESTING_DOC.md.
- Audit logs capture all transfer lifecycle events and provide sufficient context for dispute resolution.

Dependencies and Configuration
------------------------------
- Environment variables of interest:
  - `STORACHA_UPLOAD_URL`, `STORACHA_API_KEY` (optional)
  - `SMS_PROVIDER`, `AT_USERNAME`, `AT_API_KEY`, `TWILIO_*`
  - `POLYGON_*` (RPC URLs, private key) for anchoring
- Recommended infra: Postgres, managed object storage for media, and a small transaction wallet for anchoring in a sandbox network.

Success Metrics
---------------
- Traceability coverage: percent of transfers with attached anchored receipts.
- Verification success rate: rate of successful OTP verifications for delivered transfers.
- Resilience: percent of receipts stored remotely vs. fallback local writes under load.

Next Steps
----------
- Finalize TESTING_DOC.md (already added) and run the happy-path E2E in a staging environment.
- Optionally scaffold tenant model and partner registry connector to support multi-customer deployments.
- Plan background job queue (Celery / RQ) to handle retries for Storacha uploads and anchoring.
