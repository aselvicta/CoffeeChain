# Chapter Four: Class and Sequence Diagrams

## 4.1 Introduction

This chapter presents the principal class relationships and runtime sequences used by CoffeeChain. The diagrams emphasise the private fertilizer tracking workflow, including dispatch, proof capture, OTP verification, receipt storage, blockchain anchoring, and auditing.

## 4.2 Class Diagrams

### 4.2.1 Core Domain Model

```mermaid
classDiagram
    class Supplier {
        +id
        +name
        +region
        +contact_phone
        +created_at
    }

    class Branch {
        +id
        +name
        +branch_type
        +district
        +region
        +created_at
    }

    class Farmer {
        +id
        +name
        +ministry_id
        +phone_number
        +district
        +created_at
    }

    class Warehouse {
        +id
        +name
        +section
        +address
        +region
        +capacity_bags
        +current_bags
    }

    class FertilizerBatch {
        +id
        +batch_code
        +fertilizer_type
        +quantity_bags
        +unit_weight_kg
        +manufacturer
        +production_date
        +expiry_date
        +certification_status
        +lifecycle_state
        +quantity_tons
        +save()
    }

    class Transfer {
        +id
        +transfer_type
        +quantity_bags
        +status
        +delivery_address
        +receiver_name
        +receiver_email
        +receiver_phone
        +created_at
        +clean()
    }

    class DeliveryProof {
        +id
        +file
        +cid
        +gps_lat
        +gps_lng
        +meta
        +uploaded_at
    }

    class OTPVerification {
        +id
        +phone_number
        +code
        +status
        +sent_at
        +verified_at
        +attempts
    }

    class BlockchainAnchor {
        +id
        +data_hash
        +tx_hash
        +network
        +anchored_at
        +payload
    }

    class Notification {
        +id
        +title
        +body
        +type
        +transfer_ids
        +is_read
        +created_at
    }

    class AuditLog {
        +id
        +action
        +details
        +created_at
    }

    Supplier "1" --> "many" FertilizerBatch : owns
    Supplier "0..1" --> "many" Transfer : from_supplier
    Branch "0..1" --> "many" Transfer : from_branch
    Branch "0..1" --> "many" Transfer : to_branch
    Branch "0..1" --> "many" Farmer : cooperative
    Warehouse "1" --> "many" FertilizerBatch : stores
    Warehouse "0..1" --> "many" Transfer : dispatches
    FertilizerBatch "1" --> "many" Transfer : batch
    Transfer "1" --> "many" DeliveryProof : proofs
    Transfer "1" --> "0..1" OTPVerification : otp_verification
    Transfer "1" --> "0..1" BlockchainAnchor : blockchain_anchor
    Transfer "1" --> "many" Notification : referenced by
    Transfer "0..1" --> "many" AuditLog : audited by
```

### 4.2.2 Service Layer and External Integrations

```mermaid
classDiagram
    class IPFSService {
        +store_file()
        +store_json()
    }

    class BlockchainService {
        +build_hash()
        +anchor_to_polygon()
    }

    class OTPService {
        +generate_code()
        +is_expired()
        +send_sms()
    }

    class SMSService {
        +send_otp_sms()
    }

    class MinistryRegistryService {
        +fetch_farmers()
        +fetch_farmer()
    }

    class PolygonAdapter {
        +anchor_transaction()
    }

    class StorageResult {
        +cid
        +is_remote
        +url
        +error
    }

    IPFSService --> StorageResult
    BlockchainService --> PolygonAdapter
    OTPService --> SMSService
    SMSService --> MinistryRegistryService : no direct dependency
```

### 4.2.3 API Layer Overview

```mermaid
classDiagram
    class AdminUserViewSet
    class MeView
    class SupplierViewSet
    class BranchViewSet
    class WarehouseViewSet
    class WarehouseCatalogView
    class FertilizerTypeCatalogView
    class FarmerViewSet
    class FertilizerBatchViewSet
    class TransferViewSet
    class DeliveryProofViewSet
    class NotificationViewSet
    class OTPVerificationViewSet
    class BlockchainAnchorViewSet
    class AuditLogViewSet
    class AuditReportView

    AdminUserViewSet --> SupplierViewSet
    AdminUserViewSet --> BranchViewSet
    WarehouseViewSet --> WarehouseCatalogView
    FarmerViewSet --> FertilizerBatchViewSet
    TransferViewSet --> DeliveryProofViewSet
    TransferViewSet --> NotificationViewSet
    TransferViewSet --> OTPVerificationViewSet
    TransferViewSet --> BlockchainAnchorViewSet
    AuditLogViewSet --> AuditReportView
```

## 4.3 Sequence Diagrams

### 4.3.1 Admin Creates a User

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Frontend Admin UI
    participant API as AdminUserViewSet
    participant DB as Database

    Admin->>UI: Submit username, password, role, profile data
    UI->>API: POST /admin-users
    API->>DB: Create User
    API->>DB: Assign group / create Supplier or Branch profile
    DB-->>API: Persisted user and profile
    API-->>UI: Return user payload with role/profile
    UI-->>Admin: Show created account
```

### 4.3.2 Supplier Creates and Dispatches a Batch

```mermaid
sequenceDiagram
    actor Supplier
    participant UI as Frontend Supplier UI
    participant API as FertilizerBatchViewSet / TransferViewSet
    participant DB as Database
    participant Audit as AuditLog

    Supplier->>UI: Enter batch details
    UI->>API: POST /batches
    API->>DB: Validate warehouse capacity
    API->>DB: Save FertilizerBatch
    API->>Audit: Record batch_created
    API-->>UI: Return batch details

    Supplier->>UI: Dispatch batch to branch
    UI->>API: POST /transfers
    API->>DB: Validate quantity and warehouse
    API->>DB: Save Transfer (SUPPLIER_TO_BRANCH)
    API->>Audit: Record transfer_created
    API-->>UI: Return transfer details
```

### 4.3.3 Branch Receives and Distributes to Farmer

```mermaid
sequenceDiagram
    actor BranchUser as Cooperative / Branch User
    participant UI as Frontend Branch UI
    participant API as TransferViewSet
    participant DB as Database
    participant Audit as AuditLog

    BranchUser->>UI: Open received dispatch
    UI->>API: POST /transfers/{id}/receive/
    API->>DB: Update transfer status = RECEIVED
    API->>Audit: Record transfer_received
    API-->>UI: Return updated transfer

    BranchUser->>UI: Allocate bags to farmer
    UI->>API: POST /transfers
    API->>DB: Validate branch balance and farmer association
    API->>DB: Save Transfer (BRANCH_TO_FARMER)
    API->>Audit: Record transfer_created
    API-->>UI: Return new transfer
```

### 4.3.4 Farmer OTP Verification and Receipt Anchoring

```mermaid
sequenceDiagram
    actor Farmer
    actor BranchUser as Cooperative / Branch User
    participant API as TransferViewSet
    participant OTP as OTP Service
    participant SMS as SMS Provider
    participant IPFS as IPFS / Storacha
    participant Chain as Polygon Adapter
    participant DB as Database
    participant Audit as AuditLog

    BranchUser->>API: POST /transfers/{id}/send_otp/
    API->>OTP: generate_code()
    API->>DB: Save OTPVerification
    API->>SMS: send_otp_sms(phone, code)
    SMS-->>API: Delivery metadata
    API->>Audit: Record otp_sent

    Farmer->>BranchUser: Provide OTP code
    BranchUser->>API: POST /transfers/{id}/verify_otp/
    API->>DB: Check OTP expiry and match
    API->>DB: Set transfer status = VERIFIED
    API->>IPFS: store_json(receipt)
    IPFS-->>API: CID / local fallback metadata
    API->>Chain: anchor_to_polygon(transfer_id, data_hash)
    Chain-->>API: tx_hash / timestamp
    API->>DB: Save BlockchainAnchor
    API->>Audit: Record otp_verified
    API-->>BranchUser: Return verification response and receipt summary
```

### 4.3.5 Upload Delivery Proof

```mermaid
sequenceDiagram
    actor BranchUser as Cooperative / Branch User
    participant UI as Frontend Proof UI
    participant API as TransferViewSet
    participant IPFS as IPFS / Storacha
    participant DB as Database
    participant Audit as AuditLog

    BranchUser->>UI: Attach photo and optional GPS metadata
    UI->>API: POST /transfers/{id}/upload_proof/
    API->>IPFS: store_file(file)
    IPFS-->>API: CID or local path fallback
    API->>DB: Save DeliveryProof
    API->>Audit: Record proof_uploaded
    API-->>UI: Return proof details
```

### 4.3.6 Lookup and Register Farmer

```mermaid
sequenceDiagram
    actor CooperativeUser as Cooperative User
    participant UI as Frontend Farmer Registry UI
    participant API as FarmerViewSet
    participant Registry as Ministry / CSV Registry
    participant DB as Database
    participant Audit as AuditLog

    CooperativeUser->>UI: Enter ministry_id
    UI->>API: GET /farmers/lookup?ministry_id=...
    API->>Registry: fetch_farmer(ministry_id)
    Registry-->>API: Farmer record or null
    API-->>UI: Return lookup result

    CooperativeUser->>UI: Confirm registration
    UI->>API: POST /farmers/register
    API->>Registry: fetch_farmer(ministry_id)
    API->>DB: Create or update Farmer
    API->>Audit: Record farmer_registered
    API-->>UI: Return farmer profile
```

### 4.3.7 Notify Receiver of Dispatch

```mermaid
sequenceDiagram
    actor SupplierUser as Supplier / Dispatch User
    participant UI as Frontend Notification UI
    participant API as TransferViewSet
    participant Email as Email Service
    participant DB as Database
    participant Notification as Notification Model

    SupplierUser->>UI: Submit receiver contact and transfer ids
    UI->>API: POST /transfers/notify-receiver/
    API->>DB: Resolve transfers and branch
    API->>Email: send_mail(subject, body, receiver_email)
    API->>Notification: Create in-app notification
    API-->>UI: Return email_sent and in_app_sent flags
```

### 4.3.8 Generate Audit Report

```mermaid
sequenceDiagram
    actor Admin as Admin / Regulator
    participant UI as Reporting UI
    participant API as AuditReportView
    participant DB as Database

    Admin->>UI: Request summary report
    UI->>API: GET /audit-report/
    API->>DB: Count dispatched, received, verified transfers
    DB-->>API: Aggregated counts
    API-->>UI: Return report payload
    UI-->>Admin: Display summary dashboard
```

## 4.4 Notes on Coverage

- The class diagrams cover the core domain model, the service layer, and the main API entry points.
- The sequence diagrams cover the critical business flows currently implemented in the backend and visible in the frontend.
- A few product areas are not yet represented in code and therefore do not have fully implemented diagrams, including tenant onboarding, billing, advanced exports, and background retries.

## 4.5 File References

- Backend domain and services: [backend/supply_chain/models.py](backend/supply_chain/models.py), [backend/supply_chain/views.py](backend/supply_chain/views.py), [backend/supply_chain/services/ipfs.py](backend/supply_chain/services/ipfs.py), [backend/supply_chain/services/sms.py](backend/supply_chain/services/sms.py), [backend/supply_chain/services/otp.py](backend/supply_chain/services/otp.py), [backend/supply_chain/services/blockchain.py](backend/supply_chain/services/blockchain.py)
- Farmer directory source: [backend/supply_chain/services/ministry_of_agriculture.py](backend/supply_chain/services/ministry_of_agriculture.py)
- Frontend components: frontend/src/app/components
