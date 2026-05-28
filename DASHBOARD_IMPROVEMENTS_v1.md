# CoffeeChain — Dashboard Improvements Specification

## Overview

This document maps the improvement requirements from the Dashboards PDF against what is already implemented in the current system (as described in `NEW_UPDATED_IMPLEMENTATION.md` and `SYSTEM_OVERVIEW.md`). For each role, it describes what already exists, what is missing, and exactly what needs to be built or changed.

The improvements span four dashboards: **Supplier**, **Retailer**, **Cooperative (AMCOS)**, and a cross-cutting **Notifications & Messaging** system that must be added to the main navigation bar for both Supplier and Retailer roles.

---

## 1. Supplier Dashboard Improvements

### 1.1 What Already Exists

The current Supplier Dashboard has:

- Sidebar tabs for Overview, Dispatch Batches, Inventory, Analytics, and History
- Summary cards for total dispatched transfers, active batches, and delivery rate
- Dispatch creation form (batch code, fertilizer type, bag count, destination branch)
- Destination selector built from retailer and cooperative branches
- Recent dispatches table (batch, product, bag count, destination, status)
- Inventory panel with low-stock highlighting
- History view
- Analytics view with dispatch volume, delivery performance, and product mix charts
- Inventory computed from total batch quantity minus dispatched quantities

### 1.2 Required Improvements

---

#### 1.2.1 Batch-Based Inventory Model

**Gap:** The current inventory model is minimal — a batch code, fertilizer type, bag count, and destination. It does not capture the richer batch metadata required for traceability and compliance.

**What to build:**

Each batch record must be extended to store and display:

| Field | Description |
|---|---|
| `batch_id` | Unique identifier, auto-generated or entered |
| `fertilizer_type` | Type of fertilizer (e.g. DAP, CAN, Urea) |
| `manufacturer` | Producing company name |
| `production_date` | Date of manufacture |
| `expiry_date` | Expiry date — drives expiry alert logic |
| `quantity_bags` | Number of bags in the batch |
| `quantity_tons` | Approximate weight in metric tons (derived from bags) |
| `supplier_source` | Which supplier account created the batch |
| `certification_status` | Certified / Pending / Rejected |
| `storage_location` | Warehouse section or physical location label |

The dispatch form must be updated to capture all of these fields. The Inventory tab must display them in a structured table with column sorting and filtering by fertilizer type or certification status.

---

#### 1.2.2 Inventory Lifecycle States

**Gap:** The current system only distinguishes between available stock and dispatched stock. There is no lifecycle state machine on batches.

**What to build:**

Each batch must pass through the following states, reflected visually as a status badge in the Inventory tab and History view:

`Manufactured → Received → In Storage → Dispatched → Delivered → Verified → Returned / Expired`

- The state transitions must be driven by API events (dispatch creation, receipt confirmation, OTP verification, expiry date crossing).
- A batch whose `expiry_date` is within 30 days of today must be automatically flagged as **Expiry Risk** with a warning badge.
- A **Returned** state must be introduced for batches where a retailer or cooperative files a discrepancy that results in a return.

---

#### 1.2.3 Enhanced Dispatch Workflow

**Gap:** The current dispatch creates a batch if it does not exist, then creates a transfer. There is no approval step, no blockchain reference, and no automated Transfer ID delivery to the receiver.

**What to build:**

The new dispatch workflow must follow this sequence:

1. Supplier creates a dispatch (batch + destination + quantity).
2. The system generates a unique **Transfer ID** and sends it directly to the receiving branch (retailer or cooperative) via the notifications system.
3. The dispatch record stores a **Blockchain Transaction ID**, **Verification Timestamp**, and **Hash Status** returned from the blockchain layer.
4. The dispatch table must display these blockchain fields alongside batch and status information.
5. An **approval step** must be introduced: dispatches begin in `Pending Approval` state and transition to `Approved` before being sent. Admin or national-level users can approve.

The dispatch form should surface a confirmation modal showing all batch and blockchain fields before final submission.

---

#### 1.2.4 Warehouse and Storage Management

**Gap:** There is no warehouse or storage location concept in the current implementation.

**What to build:**

A new **Warehouse** tab (or sub-section within Inventory) must be added with:

- A list of defined storage locations (name, section, capacity in bags)
- Current occupancy per location (bags stored vs. capacity)
- Visual capacity bar indicators (green / amber / red by fill percentage)
- A low-stock alert threshold setting per location
- Automatic low-stock alerts when a location drops below its threshold

---

#### 1.2.5 Supplier Analytics Enhancements

**Gap:** Analytics currently shows dispatch volume, delivery performance, and product mix. The required additions expand this significantly.

**What to build:**

Add the following to the Analytics tab:

- **Monthly Dispatch Trends** — line chart of dispatches per month over the past 12 months (already partially present; ensure it is API-backed)
- **Most Distributed Fertilizer Type** — bar chart or ranked list by volume
- **Regional Distribution Analytics** — choropleth or table showing dispatch volumes broken down by destination region
- **Expiry Risk Analysis** — table of batches nearing or past expiry, with days-to-expiry column and downloadable report action
- **Inventory Turnover Rate** — computed metric: total dispatched in period ÷ average inventory in period, displayed as a KPI card

---

#### 1.2.6 Batch Traceability Search

**Gap:** There is no batch search or movement history feature in the current supplier view.

**What to build:**

Add a **Trace Batch** tab or modal accessible from the History and Inventory views:

- Input: Batch ID search field
- Output: Full movement timeline displayed as a vertical step list:
  - Supplier created batch → Dispatch to [branch] → Retailer received → Distributed to [cooperative or farmer] → OTP verified
- Each step shows timestamp, actor, quantity, and verification status
- Blockchain hash reference shown at each verified step

---

#### 1.2.7 Audit Log

**Gap:** The current system has audit data at the admin level but not surfaced in the supplier dashboard.

**What to build:**

Add an **Audit Log** section within the History tab, showing a chronological table of:

- Who created or modified a dispatch record (username + role)
- What action was taken (created, modified, approved, cancelled)
- Timestamp of action
- Current verification status of the affected record

---

#### 1.2.8 Inventory Reconciliation Panel

**Gap:** There is no reconciliation mechanism comparing dispatched vs. received vs. allocated quantities.

**What to build:**

Add a **Reconciliation** sub-section within the Analytics or Inventory tab:

- For each batch, show three columns side by side: **Dispatched**, **Confirmed Received**, **Allocated to Farmers**
- Compute and display a **Variance** column (dispatched minus received)
- Flag records where variance exceeds a configurable tolerance as potential losses, misreporting, or fraud
- Export reconciliation report to CSV

---

#### 1.2.9 Notifications and Messaging (Supplier)

**Gap:** There is no notification or messaging system in the current implementation.

**What to build:**

Add a **Notifications** icon/link to the main navigation bar of the Supplier Dashboard. When clicked, it opens a dedicated panel with:

- **Inbox** — all received alerts and messages from retailers and cooperatives, organized as a list with read/unread/starred states
- **Unread count badge** on the nav icon
- **Message thread view** — clicking a message opens the full thread with timestamps and sender details
- **Response panel** — a text input at the bottom of each thread allowing the supplier to reply
- **Alert categories** displayed as filter tabs: Expiry Alerts, Unverified Delivery Alerts, Low Stock Alerts, Delayed Confirmation Alerts, Messages
- Alerts are auto-generated by the system based on batch state and delivery timelines; messages are sent manually by retailers and cooperatives

---

## 2. Retailer Dashboard Improvements

### 2.1 What Already Exists

The current Retailer Dashboard has:

- Sidebar tabs for Overview, Receive Batches, Distribute Fertilizer, Farmers, Analytics, and History
- Summary cards for stock available, distributed today, and total farmers
- Receive batch workflow using a Transfer ID
- Distribution workflow with batch selection, farmer selection, bag quantity, optional proof upload
- OTP modal for farmer verification
- Recent receipts and distributions lists
- Transaction history combining receipts and distributions
- Analytics view with trend and OTP status charts

### 2.2 Required Improvements

---

#### 2.2.1 Overview Dashboard Additions

**Gap:** The overview cards are minimal. Several key operational indicators are missing.

**What to add to the Overview tab:**

| Metric Card | Description |
|---|---|
| Current Inventory | Total bags in stock with approximate weight in tons |
| Active Fertilizer Batches | Count of batches currently held in inventory |
| Pending Transfers | Count of supplier dispatches not yet confirmed as received |
| Transfers Completed | Count of confirmed receipts to date |
| Low Stock Alerts | Count of batch lines below threshold (with link to inventory detail) |
| Recent Distributions | Last 5 distribution records inline |
| Expiring Batches | Count of batches expiring within 30 days |
| Total Farmers / Customers | Already present; keep and ensure it is API-backed |

---

#### 2.2.2 Receive Batches — Enhanced Workflow

**Gap:** The current receive flow only takes a Transfer ID. It lacks full auto-populated supplier and batch detail, accept/reject/discrepancy actions, and blockchain confirmation display.

**What to build:**

When a retailer enters a Transfer ID, the system must auto-fetch and display:

**Supplier Information**
- Supplier name
- Supplier ID
- Dispatch reference number

**Batch Information**
- Batch ID
- Fertilizer type
- Quantity sent (bags)
- Production date
- Expiry date

**Verification Information**
- Quantity received (editable by retailer)
- Verification status
- Discrepancy status
- Remarks field

**Blockchain Information**
- Transaction hash
- Verification timestamp
- Immutable receipt confirmation label

The retailer must then select one of three actions:

- **Accept** — confirms receipt at the stated quantity, triggers blockchain immutable record
- **Reject** — marks the transfer as rejected with a mandatory remarks field
- **File Discrepancy** — opens a discrepancy sub-form requiring:
  - Claimed quantity received
  - Evidence attachment (signed delivery note or warehouse receipt proof)
  - Written remarks

On discrepancy submission, the transfer status changes to **Under Review**. The system admin reviews the evidence against the blockchain record and can update the status to **Incomplete**, closing the discrepancy case.

---

#### 2.2.3 Distribute Fertilizer — Enhanced Recipient Handling

**Gap:** The current distribution flow supports farmer and cooperative recipients but does not handle individual buyers, does not capture full recipient details, and does not store quick-reorder records for non-registered buyers.

**What to build:**

The distribution form must support three recipient types:

**Farmer / Individual Buyer**
- Full name
- Phone number
- Location / village
- Buyer category (Farmer / Individual)
- Option to save details to the customer database for future quick-fill

**Cooperative**
- Cooperative name
- Cooperative ID
- Authorized receiver name

For non-registered individual buyers, the system must allow direct entry without requiring pre-registration, then save their details to the database so that on their next visit, the retailer can search and auto-fill their information.

The distribution form must also capture:

**Fertilizer Allocation Details**
- Batch ID (selected from available inventory)
- Fertilizer type (auto-filled from batch)
- Quantity allocated (bags)
- Allocation date (auto-filled, editable)

**Verification Information**
- Confirmation status
- OTP confirmation toggle (optional for non-farmer recipients)
- Transfer status

**Blockchain Information**
- Transaction reference (auto-generated)
- Allocation timestamp

---

#### 2.2.4 Farmers and Buyers Registry Enhancements

**Gap:** The current Farmers tab shows member details but does not display per-customer transaction history on drill-down.

**What to build:**

The Farmers & Buyers tab must display:

**Personal Information** (existing + additions)
- Full name
- Contact number
- Village / location
- Buyer category (Farmer / Individual Buyer / Cooperative)

**On click — Customer Detail View**
- A slide-out panel or modal showing the full list of past transactions for that customer:
  - Date, batch ID, fertilizer type, quantity, verification status
  - Blockchain reference per transaction

---

#### 2.2.5 Analytics Enhancements

**Gap:** Analytics currently shows trends and OTP status. The required additions expand coverage.

**What to add:**

**Inventory Analytics**
- Total stock (current, in bags and tons)
- Low-stock fertilizer lines
- Expiring batches list with days-to-expiry
- Inventory turnover metric

**Distribution Analytics**
- Most distributed fertilizer type (bar chart)
- Distribution trends over time (line chart)
- Regional / area demand breakdown by recipient location

**Cooperative Transfer Analytics**
- Transfer frequency and volumes to cooperatives
- Pending confirmations count

**Blockchain Analytics**
- Verified transactions count
- Discrepancy cases count with resolution status breakdown
- Audit activity summary

---

#### 2.2.6 Audit History Tab

**Gap:** The History tab currently combines receipts and distributions but does not structure audit and discrepancy data separately.

**What to restructure:**

Split the History tab into sub-sections:

- **System Actions** — chronological log of batch receipt actions, distribution actions, cooperative transfer actions, verification actions (who did what and when)
- **Discrepancy Cases** — list of filed discrepancies with reported mismatch details, investigation outcomes, and resolution status per case

---

#### 2.2.7 Notifications and Messaging (Retailer)

**Gap:** Same gap as the Supplier side — no notification or messaging system exists.

**What to build:**

Add a **Notifications** icon/link to the main navigation bar of the Retailer Dashboard:

- **Inbox** — all received alerts and messages from the supplier, with read/unread/starred states
- **Unread count badge** on the nav icon
- **Message thread view** with full history and timestamps
- **Response/Inquiry panel** — the retailer can compose inquiries to the supplier and follow through the thread
- **Alert categories** as filter tabs: Dispatch Notifications, Discrepancy Updates, Expiry Alerts, Low Stock Alerts, System Messages

---

## 3. Cooperative (AMCOS) Dashboard Improvements

### 3.1 What Already Exists

The current Cooperative Dashboard has:

- Sidebar tabs for Overview, Farmer Registry, Receive Fertilizer, Distribute Fertilizer, Verify Distribution, Analytics, and History
- Summary cards for member farmers, fertilizer stock, distributed today, and distributions verified
- Farmer registry panel
- Fertilizer receipt workflow (Transfer ID input)
- Fertilizer distribution with farmer selection, bag entry, proof upload, OTP initiation
- Verification panel (pending and verified records)
- Transaction history (receipts and distributions)
- Analytics with verification trend and mix charts
- OTP modal integration

### 3.2 Required Improvements

The PDF notes for AMCOS were captured on **28 May 2026** but the detailed content page for AMCOS was not yet written at the time of the upload (the page shows the header and date but no body content). The improvements below are therefore inferred from the PDF's Supplier and Retailer requirements, applied symmetrically to the cooperative context, and from the gaps visible in the current implementation.

---

#### 3.2.1 Overview Dashboard Additions

Extend the overview to match the retailer improvements:

- Current inventory (bags and tons)
- Active fertilizer batches in cooperative storage
- Pending transfers from suppliers or retailers not yet confirmed
- Expiring batches within 30 days
- Member farmers count (already present)
- Distributions verified today and in total

---

#### 3.2.2 Receive Fertilizer — Enhanced Workflow

Apply the same enhanced receipt workflow described for the Retailer (section 2.2.2) to the cooperative context:

- Auto-populated supplier and batch details on Transfer ID entry
- Accept / Reject / File Discrepancy actions
- Evidence attachment for discrepancies
- Blockchain confirmation display

---

#### 3.2.3 Distribute Fertilizer — Enhanced Recipient Handling

The cooperative distributes only to its own registered member farmers. Enhance the distribution form to capture:

- Full farmer details (name, Ministry ID, phone, village)
- Fertilizer allocation details (batch, type, bags, date)
- OTP verification toggle
- Blockchain transaction reference and timestamp

Allow quick-fill by searching the farmer registry before entering manual details.

---

#### 3.2.4 Farmer Registry Enhancements

Same enhancement as the Retailer Farmers tab:

- On clicking a farmer, show a full transaction history panel (all past fertilizer allocations and coffee collection records)
- Allow editing of farmer contact details and village

---

#### 3.2.5 Analytics Enhancements

Mirror the Retailer analytics additions:

- Inventory analytics (stock, expiry, turnover)
- Distribution analytics (trends, most distributed type)
- Blockchain analytics (verified transactions, discrepancy cases)
- Coffee collection analytics (if applicable to the cooperative workbench view)

---

#### 3.2.6 Notifications and Messaging (Cooperative)

Add the same Notifications nav bar item as Supplier and Retailer:

- Inbox for messages from suppliers and retailers
- Alert categories: Incoming Transfer Alerts, Expiry Alerts, Verification Reminders, System Messages
- Response panel for composing replies

---

## 4. Cross-Cutting: Notifications and Messaging System

### 4.1 Architecture

The notification and messaging system must be shared infrastructure used by Supplier, Retailer, and Cooperative dashboards. It should be backed by a dedicated API resource.

**Proposed API endpoints:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/notifications/` | GET | Fetch all notifications for the current user |
| `/api/notifications/:id/read/` | PATCH | Mark a notification as read |
| `/api/notifications/:id/star/` | PATCH | Star or unstar a notification |
| `/api/messages/` | GET | Fetch all message threads for the current user |
| `/api/messages/` | POST | Create a new message thread or reply |
| `/api/messages/:thread_id/` | GET | Fetch a specific thread with full message history |
| `/api/alerts/` | GET | Fetch system-generated alerts (expiry, low stock, unverified) |

### 4.2 Frontend Component

A shared `<NotificationPanel />` component must be built and mounted in the top navigation bar of all role-based dashboards. It must:

- Show a bell icon with an unread count badge
- Open a slide-out drawer on click
- Render three tabs: **Alerts**, **Messages**, **Starred**
- In the Alerts tab: list auto-generated system alerts grouped by category
- In the Messages tab: list message threads with sender, subject, timestamp, and read state
- In the Starred tab: list starred messages across all threads
- Clicking a message thread opens it inline with a reply input at the bottom
- The component must poll for new notifications at a configurable interval (suggested: every 60 seconds) or use WebSocket if the backend supports it

### 4.3 Auto-Generated Alert Types

The following alerts must be automatically generated by backend logic:

| Alert Type | Trigger Condition | Recipients |
|---|---|---|
| Expiry Alert | Batch `expiry_date` ≤ 30 days from today | Supplier, Retailer, Cooperative holding the batch |
| Unverified Delivery Alert | Transfer created but not confirmed received within 48 hours | Supplier, Admin |
| Low Stock Alert | Inventory for a batch drops below configured threshold | Retailer, Cooperative |
| Delayed Confirmation Alert | OTP-based distribution created but OTP not verified within 24 hours | Retailer, Cooperative |
| Transfer ID Notification | New dispatch created by supplier | Receiving Retailer or Cooperative |
| Discrepancy Update | Admin changes discrepancy case status | Filing Retailer or Cooperative |

---

## 5. Backend Model Changes Required

The following summarises the database/API-level changes implied by the improvements above. These should be addressed before or alongside the frontend work.

### Batch Model Extensions

Add fields: `manufacturer`, `production_date`, `expiry_date`, `certification_status`, `storage_location`, `lifecycle_state`

### Transfer Model Extensions

Add fields: `blockchain_tx_id`, `verification_timestamp`, `hash_status`, `hash_verified`, `discrepancy_status`, `discrepancy_evidence_url`, `discrepancy_remarks`, `approved_by`, `approval_timestamp`

### New Models

- `Notification` — user, type, title, body, read, starred, created_at
- `MessageThread` — participants, subject, created_at
- `Message` — thread, sender, body, created_at
- `StorageLocation` — name, section, capacity_bags, current_bags
- `AuditLog` — user, action, target_model, target_id, timestamp, verification_status
- `ReconciliationRecord` — batch, dispatched_qty, confirmed_received_qty, allocated_qty, variance, flagged

---

## 6. Priority Order

The improvements are recommended in the following implementation order based on dependency and user impact:

1. **Batch model extension** — foundational for all traceability and expiry features
2. **Transfer model extension** — required for the enhanced receive workflow and blockchain fields
3. **Enhanced Receive Batches workflow** (Retailer + Cooperative) — highest operational impact
4. **Notifications and Messaging system** — backend models and shared frontend component
5. **Warehouse and Storage Management** (Supplier)
6. **Inventory Reconciliation Panel** (Supplier)
7. **Batch Traceability Search** (Supplier)
8. **Retailer and Cooperative analytics extensions**
9. **Audit Log and Discrepancy History** tabs
10. **Overview dashboard metric additions** across all roles

---

*Last updated: May 2026. Based on Dashboards.pdf requirements and NEW_UPDATED_IMPLEMENTATION.md current state.*
