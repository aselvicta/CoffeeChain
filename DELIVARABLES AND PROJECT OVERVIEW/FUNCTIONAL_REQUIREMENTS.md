# Chapter Two: Functional and Non-Functional Requirements

## 2.1 Introduction

This chapter presents the functional and non-functional requirements of CoffeeChain in its current private B2B form. Each requirement is paired with the current implementation status and the remaining work needed for completion.

## 2.2 Functional Requirements

### 2.2.1 User and Role Management

- **Requirement:** Create and manage users and assign roles for admin, supplier, cooperative, retailer, and enterprise tenant users.
- **Already done:** User creation, group assignment, and RBAC are implemented through the backend administration endpoints.
- **Not yet done:** Tenant scoping, tenant administration interfaces, invitation flows, and tenant-aware policy enforcement.

### 2.2.2 Farmer and Directory Integration

- **Requirement:** Resolve and register farmers from a trusted directory and support customer-provided directories.
- **Already done:** CSV-backed lookup and registration are available for development and local testing.
- **Not yet done:** Pluggable production connectors, sync jobs, mapping tools, and tenant-scoped directories.

### 2.2.3 Warehouse and Batch Management

- **Requirement:** Support CRUD operations for warehouses and fertilizer batches, including capacity validation and derived tonnage calculations.
- **Already done:** Warehouse and fertilizer batch models, validations, lifecycle states, and derived tonnage computation are implemented.
- **Not yet done:** Additional batch reconciliation utilities and bulk import workflows.

### 2.2.4 Dispatch and Transfer Flows

- **Requirement:** Support supplier-to-branch and branch-to-farmer transfers with quantity validation and transfer status handling.
- **Already done:** Transfer creation, receive actions, OTP initiation, and OTP-based verification are implemented.
- **Not yet done:** Bulk transfer import, richer status transitions, and enhanced failure reporting.

### 2.2.5 Delivery Proof Capture

- **Requirement:** Upload delivery proof files with optional GPS and metadata and store a persistent CID.
- **Already done:** Delivery proof storage, CID handling, and local fallback support are implemented.
- **Not yet done:** Image optimisation, virus scanning, and low-bandwidth upload support.

### 2.2.6 OTP Verification

- **Requirement:** Generate and send OTPs, then verify them to move a transfer to a verified state.
- **Already done:** OTP generation, SMS dispatch, expiry checks, and verification flows are implemented.
- **Not yet done:** Rate limiting, anti-abuse controls, and alternative verification channels.

### 2.2.7 Off-chain Receipt Storage

- **Requirement:** Store verification receipts off-chain and fall back to local storage if remote storage is unavailable.
- **Already done:** Storacha/IPFS upload with local receipt fallback is in place.
- **Not yet done:** Automatic re-upload retries and receipt archival workflows.

### 2.2.8 Blockchain Anchoring

- **Requirement:** Generate an immutable blockchain reference for verification receipts.
- **Already done:** Receipt hashing, anchoring wrapper logic, and blockchain anchor records are implemented.
- **Not yet done:** Production-network validation, retry logic, monitoring, and full-chain integration tests.

### 2.2.9 Audit Logging and Reporting

- **Requirement:** Record auditable events and provide operational reports and exports.
- **Already done:** Audit logging and summary reporting exist.
- **Not yet done:** Advanced export, tenant-scoped reporting, and scheduled report generation.

### 2.2.10 Notifications and Email

- **Requirement:** Notify users in-app and by email when dispatch events occur.
- **Already done:** In-app notifications and receiver email notifications are implemented.
- **Not yet done:** Notification preferences and third-party notification queueing.

### 2.2.11 Frontend User Experience

- **Requirement:** Provide dashboards and workflow pages for all major user roles.
- **Already done:** Core workflow components and dashboards are already present.
- **Not yet done:** Tenant branding, mobile polish, and reporting screens.

## 2.3 Non-Functional Requirements

### 2.3.1 Security

- **Requirement:** Secure authentication, role-based authorization, secrets management, and encrypted communication.
- **Already done:** Authentication and permissions are in place.
- **Not yet done:** Secret-store integration, full TLS hardening, and key rotation policies.

### 2.3.2 Scalability and Performance

- **Requirement:** Support concurrent transfers, large data volumes, and multiple tenants.
- **Already done:** The platform is built on Django and a relational database, which supports structured scaling.
- **Not yet done:** Caching, indexing optimisation, load testing, and horizontal scaling strategy.

### 2.3.3 Reliability and Availability

- **Requirement:** Maintain core workflow availability and recover gracefully from external service failures.
- **Already done:** Graceful fallback for receipt storage and abstraction layers for SMS and anchoring exist.
- **Not yet done:** Background retries, replication, health checks, and reconciliation jobs.

### 2.3.4 Observability and Monitoring

- **Requirement:** Provide logs, metrics, tracing, and alerts for key operations.
- **Already done:** Basic event logging and audit records are in place.
- **Not yet done:** Centralised monitoring, dashboards, and alert rules.

### 2.3.5 Maintainability and Testing

- **Requirement:** Maintainable code, unit testing, integration testing, and CI coverage.
- **Already done:** The implementation is modular and documented.
- **Not yet done:** Automated test suites and pipeline validation.

### 2.3.6 Privacy and Compliance

- **Requirement:** Minimise data, support retention policies, and allow exports or deletion where needed.
- **Already done:** Basic data minimisation is reflected in the current receipts and records.
- **Not yet done:** Retention policies, privacy controls, and export/delete workflows.

### 2.3.7 Multi-tenancy and SLAs

- **Requirement:** Support tenant isolation, usage tracking, onboarding, and service-level commitments.
- **Already done:** The private platform direction has been established.
- **Not yet done:** Tenant model, billing, usage metering, and SLA tooling.

## 2.4 Acceptance Criteria

The system should be considered functionally acceptable when the following conditions are met:

1. A supplier can create a fertilizer batch and dispatch it to a branch.
2. A branch can receive the batch and allocate part of it to a farmer.
3. The farmer can confirm receipt using OTP and proof mechanisms.
4. The receipt is stored off-chain and anchored on-chain.
5. Auditors can review actions using stored logs and reports.
6. Failed external operations are retried or safely degraded.

## 2.5 Summary

Most core functional requirements are already implemented. The main outstanding work lies in tenant support, integrations, reporting exports, operational hardening, and release quality assurance.
