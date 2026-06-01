# Chapter Five: ERD and Database Architecture

## 5.1 Introduction

This chapter describes the database design used by CoffeeChain and presents the principal entities and relationships that support the private fertilizer tracking platform.

## 5.2 Database Architecture Overview

CoffeeChain uses Django with a relational database backend. The core data model is centered on fertilizer inventory, dispatch transfers, proof-of-delivery, verification, audit logging, and system notifications.

### 5.2.1 Architectural Notes

- **Database style:** Relational, normalized around core business entities.
- **Primary ORM:** Django ORM.
- **Storage strategy:** Transactional data is stored in the main database; files and receipts are stored off-chain in Storacha/IPFS or local media fallback when remote storage is unavailable.
- **Audit strategy:** Important actions are persisted as `AuditLog` records so operational activity can be traced.
- **Verification strategy:** OTP and blockchain anchor records are stored alongside transfer records to preserve traceability.

### 5.2.2 Logical Layers

```mermaid
flowchart TD
    A[Application Layer\nDjango REST API] --> B[Domain Layer\nModels and Business Rules]
    B --> C[Persistence Layer\nRelational Database]
    B --> D[External Storage\nStoracha / IPFS]
    B --> E[Blockchain Layer\nPolygon Anchor]
    B --> F[Messaging Layer\nSMS / Email]
```

## 5.3 Entity Relationship Diagram

```mermaid
erDiagram
    SUPPLIER {
        int id PK
        string name
        string region
        string contact_phone
        datetime created_at
    }

    BRANCH {
        int id PK
        string name
        string branch_type
        string district
        string region
        datetime created_at
    }

    FARMER {
        int id PK
        string name
        string ministry_id UK
        string phone_number
        string district
        datetime created_at
    }

    WAREHOUSE {
        int id PK
        string name
        string section
        string address
        string region
        int capacity_bags
        int current_bags
        datetime created_at
    }

    FERTILIZER_BATCH {
        int id PK
        int supplier_id FK
        string batch_code UK
        string fertilizer_type
        int quantity_bags
        decimal unit_weight_kg
        string manufacturer
        date production_date
        date expiry_date
        date date_received
        string source_reference
        string certification_status
        int storage_location_id FK
        string lifecycle_state
        decimal quantity_tons
        datetime created_at
        text notes
    }

    TRANSFER {
        int id PK
        int batch_id FK
        int warehouse_id FK
        int from_supplier_id FK
        int from_branch_id FK
        int to_branch_id FK
        int farmer_id FK
        string transfer_type
        string delivery_address
        string receiver_name
        string receiver_email
        string receiver_phone
        string receiver_organisation
        int quantity_bags
        string status
        int created_by_id FK
        datetime created_at
        text notes
    }

    DELIVERY_PROOF {
        int id PK
        int transfer_id FK
        string file
        string cid
        decimal gps_lat
        decimal gps_lng
        json meta
        int uploaded_by_id FK
        datetime uploaded_at
    }

    OTP_VERIFICATION {
        int id PK
        int transfer_id FK
        string phone_number
        string code
        string status
        datetime sent_at
        datetime verified_at
        int attempts
    }

    BLOCKCHAIN_ANCHOR {
        int id PK
        int transfer_id FK
        string data_hash
        string tx_hash
        string network
        datetime anchored_at
        json payload
    }

    NOTIFICATION {
        int id PK
        int user_id FK
        string title
        text body
        string type
        json transfer_ids
        boolean is_read
        datetime created_at
    }

    AUDIT_LOG {
        int id PK
        string action
        int user_id FK
        int transfer_id FK
        json details
        datetime created_at
    }

    USER {
        int id PK
        string username
        string first_name
        string last_name
        string email
    }

    SUPPLIER ||--o| USER : user
    BRANCH ||--o| USER : user
    SUPPLIER ||--o{ FERTILIZER_BATCH : owns
    SUPPLIER ||--o{ TRANSFER : from_supplier
    BRANCH ||--o{ TRANSFER : from_branch
    BRANCH ||--o{ TRANSFER : to_branch
    BRANCH ||--o{ FARMER : cooperative
    WAREHOUSE ||--o{ FERTILIZER_BATCH : stores
    WAREHOUSE ||--o{ TRANSFER : dispatches
    FERTILIZER_BATCH ||--o{ TRANSFER : batch
    TRANSFER ||--o{ DELIVERY_PROOF : proofs
    TRANSFER ||--o| OTP_VERIFICATION : otp_verification
    TRANSFER ||--o| BLOCKCHAIN_ANCHOR : blockchain_anchor
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
    TRANSFER ||--o{ AUDIT_LOG : audited_in
    USER ||--o| SUPPLIER : profile
    USER ||--o| BRANCH : profile
```

## 5.4 Table-by-Table Summary

### 5.4.1 Supplier
- Stores supplier identity and contact details.
- Linked one-to-one with a Django user account.
- Owns many fertilizer batches and can originate transfers.

### 5.4.2 Branch
- Represents cooperatives, retailers, or regulatory branches.
- Stores branch type, district, and region.
- Linked one-to-one with a Django user account.
- Can receive supplier transfers and create branch-to-farmer transfers.

### 5.4.3 Farmer
- Stores farmer identity and ministry-style identifier.
- Optionally linked to a cooperative branch.
- Used during branch-to-farmer distribution and OTP confirmation.

### 5.4.4 Warehouse
- Stores warehouse capacity and operational contact details.
- Tracks current inventory in bags.
- Can contain multiple fertilizer batches.

### 5.4.5 FertilizerBatch
- Core inventory entity.
- Contains batch code, fertilizer type, quantity, weight, certification status, lifecycle state, and warehouse location.
- Computes `quantity_tons` from bag count and unit weight when not explicitly provided.

### 5.4.6 Transfer
- Represents movement of fertilizer through the supply chain.
- Supports supplier-to-branch and branch-to-farmer transfer types.
- Stores receiver details, status, warehouse, involved actor references, and quantity.

### 5.4.7 DeliveryProof
- Stores proof-of-delivery metadata, uploaded file reference, CID, GPS coordinates, and free-form metadata.

### 5.4.8 OTPVerification
- Stores OTP lifecycle details for farmer confirmation.
- Tracks attempts, sent time, verification time, and current state.

### 5.4.9 BlockchainAnchor
- Stores a cryptographic hash of the verification payload and blockchain transaction reference.
- Keeps a JSON payload summary for audit and traceability.

### 5.4.10 Notification
- Stores in-app notification content and the transfer IDs associated with the alert.
- Used to notify receiver branches about dispatches.

### 5.4.11 AuditLog
- Stores system events such as batch creation, transfer creation, OTP events, proof uploads, and verification.
- Used for operational traceability and reporting.

## 5.5 Relationship Summary

- A supplier can own many fertilizer batches.
- A fertilizer batch can have many transfers over its lifecycle.
- A transfer can have multiple proofs, but usually one OTP verification and one blockchain anchor.
- A warehouse can contain many batches and may be associated with transfer dispatches.
- A branch can both receive stock and dispatch to farmers.
- A farmer belongs to at most one cooperative branch at a time.
- Users receive notifications and generate audit records through system actions.

## 5.6 Keys, Constraints, and Data Integrity

- `ministry_id` in `Farmer` is unique.
- `batch_code` in `FertilizerBatch` is unique.
- `Supplier.user` and `Branch.user` are one-to-one links to authentication users.
- `Transfer.clean()` enforces required relationships depending on transfer type.
- Warehouse capacity is validated before adding or updating batch stock.
- OTP expiration and verification state transitions are handled in application logic.

## 5.7 Current Status

- **Implemented:** Core entities, transfer tracking, batch inventory, proof storage, OTP verification, blockchain anchor records, notifications, and audit logs.
- **Partially implemented:** Partner directory integration, advanced exports, background retries, and multi-tenant data isolation.
- **Not yet implemented:** Tenant/billing tables, usage metering, partner connector tables, and advanced analytics warehouse.

## 5.8 Files Referenced

- [backend/supply_chain/models.py](backend/supply_chain/models.py)
- [backend/supply_chain/views.py](backend/supply_chain/views.py)
- [backend/supply_chain/serializers.py](backend/supply_chain/serializers.py)
- [backend/supply_chain/services/ipfs.py](backend/supply_chain/services/ipfs.py)
- [backend/supply_chain/services/blockchain.py](backend/supply_chain/services/blockchain.py)
- [backend/supply_chain/services/otp.py](backend/supply_chain/services/otp.py)
- [backend/supply_chain/services/sms.py](backend/supply_chain/services/sms.py)
- [backend/supply_chain/services/ministry_of_agriculture.py](backend/supply_chain/services/ministry_of_agriculture.py)
