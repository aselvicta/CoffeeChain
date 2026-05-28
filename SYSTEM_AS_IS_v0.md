# CoffeeChain - Updated Implementation Summary

## Overview

This document captures what has been implemented so far across the CoffeeChain app, with emphasis on the dashboard screens, the role-based logic behind them, and the current API-driven workflows.

The project currently combines:

- Public-facing landing and login flows
- Role-based dashboard routing after authentication
- National, regional, and cooperative operational views
- Supplier, retailer, and cooperative workspaces for dispatch, receipt, distribution, and verification
- Shared UI widgets such as production balance, trust seals, sync status, and OTP verification

---

## 1. Application Flow and Routing

### Public Entry Points

- The landing page is available at `/`.
- Login is handled through `/login`.
- The main application shell is available at `/app`.
- Unknown routes fall back to the landing page.

### Main Routing Logic

- The app boots through `MainApp`, which checks for an access token.
- If no token exists, the login screen is shown.
- If a token exists, the app fetches the current profile from the backend.
- The profile is mapped into a dashboard-friendly user object.
- The user is routed to the correct dashboard based on role:
  - `admin` and `national` -> Admin Dashboard
  - `supplier` -> Supplier Dashboard
  - `retailer` -> Retailer Dashboard
  - `cooperative` -> AMCOS Dashboard

### Authentication Logic

- Login uses backend authentication through `/api/login/`.
- The returned access token is stored in local storage.
- Subsequent requests send the token as a Bearer header.
- Logout clears the stored token and resets the session state.

### Backend API Integration

The frontend currently consumes these core endpoints:

- `/api/me/` for the authenticated profile
- `/api/users/` for user administration
- `/api/suppliers/` for supplier data
- `/api/branches/` for retailer and cooperative branch data
- `/api/farmers/` for farmer records
- `/api/batches/` for batch records
- `/api/transfers/` for receipts and distributions
- `/api/transfers/:id/receive/` for confirming receipts
- `/api/transfers/:id/send_otp/` for OTP generation
- `/api/transfers/:id/verify_otp/` for OTP verification
- `/api/transfers/:id/upload_proof/` for optional delivery proof uploads
- `/api/reports/audit/` for audit summary data

---

## 2. National / Admin Dashboard

### Purpose

The Admin Dashboard is the control center for national oversight. It aggregates supplier, retailer, cooperative, and verification data into a single management view.

### Implemented Features

- Sidebar navigation with tabs for Overview, Suppliers, Retailers, Cooperatives, and User Accounts.
- Collapsible sidebar for compact viewing.
- Dashboard header with user identity and logout control.
- Overview metric cards for:
  - Total suppliers
  - Active retailers
  - Cooperatives
  - Distributions verified
- Monthly trend chart for activity tracking.
- Distribution chart showing national composition.
- Regional summary table derived from branch data.
- Recent activity feed that reflects dispatch, verification, and audit gaps.

### Admin Logic

- Pulls data from suppliers, branches, audit reports, transfers, and users in parallel.
- Derives display records from backend objects for consistent IDs and labels.
- Groups branches into retailer and cooperative lists.
- Computes region-based summaries from the loaded branch data.
- Supports user creation through the admin interface.
- Filters and sorts supplier, retailer, cooperative, and user views.
- Excludes the currently logged-in admin account from the user list.

### User Management Area

- Create new users from the dashboard.
- Search users by username, role, or organization.
- Sort user rows by username, role, or organization.
- Filter by role.
- View and manage role-based accounts in a single table.

---

## 3. Supplier Dashboard

### Purpose

The Supplier Dashboard manages fertilizer stock, dispatch creation, and dispatch history for supplier organizations.

### Implemented Features

- Sidebar tabs for Overview, Dispatch Batches, Inventory, Analytics, and History.
- Summary cards for total dispatched transfers, active batches, and delivery rate.
- Quick actions for creating dispatches and checking inventory.
- Dispatch form that allows a supplier to:
  - Enter a batch code
  - Choose fertilizer type
  - Enter bag count
  - Select a destination branch
- Destination selector built from retailer and cooperative branches.
- Recent dispatches table with batch, product, bag count, destination, and status.
- Inventory panel showing remaining stock by batch.
- Low-stock highlighting when inventory drops below the threshold.
- History view for dispatched transfers.
- Analytics view with dispatch volume, delivery performance, and product mix charts.

### Supplier Logic

- Loads branches, batches, and transfers from the backend.
- Filters transfer history to only show supplier-originated transfers.
- Creates a batch if the batch code does not already exist.
- Creates a supplier-to-branch transfer after dispatch.
- Recomputes inventory from total batch quantity minus dispatched quantities.
- Supports live refresh after dispatch creation.

---

## 4. Retailer Dashboard

### Purpose

The Retailer Dashboard handles receiving fertilizer batches, distributing fertilizer to farmers, and tracking OTP-verified delivery flows.

### Implemented Features

- Sidebar tabs for Overview, Receive Batches, Distribute Fertilizer, Farmers, Analytics, and History.
- Summary cards for stock available, distributed today, and total farmers.
- Quick actions for fertilizer distribution and farmer lookup.
- Receive batch workflow using a transfer ID.
- Distribution workflow using:
  - Batch selection
  - Farmer selection
  - Bag quantity entry
  - Optional proof upload
- OTP modal integration for farmer verification.
- Recent receipts list.
- Recent distributions list with OTP status.
- Transaction history combining receipts and distributions.
- Analytics view with trend and OTP status charts.

### Retailer Logic

- Loads farmer and transfer data from the backend.
- Filters inbound supplier transfers addressed to the retailer branch.
- Filters outbound branch-to-farmer transfers initiated by the retailer branch.
- Records receipt confirmations through the receive endpoint.
- Creates transfer records for fertilizer distributions to farmers.
- Sends OTP messages after distribution creation.
- Supports OTP verification and resend through the modal flow.
- Supports optional proof upload against the transfer record.

---

## 5. Cooperative / AMCOS Dashboard

### Purpose

The Cooperative Dashboard is the AMCOS-level operational workspace for farmer registry, fertilizer receipt, fertilizer distribution, and distribution verification.

### Implemented Features

- Sidebar tabs for Overview, Farmer Registry, Receive Fertilizer, Distribute Fertilizer, Verify Distribution, Analytics, and History.
- Summary cards for:
  - Member farmers
  - Fertilizer stock
  - Distributed today
  - Distributions verified
- Quick action cards for distribution, verification, and registry access.
- Farmer registry panel showing member details.
- Fertilizer receipt workflow using a transfer ID.
- Fertilizer distribution workflow with farmer selection, bag entry, optional proof upload, and OTP initiation.
- Verification panel showing pending and verified distribution records.
- Transaction history combining receipts and distributions.
- Analytics view with verification trend and verification mix charts.
- OTP modal integration for verifying farmer distributions.

### Cooperative Logic

- Loads farmers and transfers from the backend.
- Filters farmers to the current cooperative branch when branch context is available.
- Filters inbound supplier-to-branch transfers for cooperative receipts.
- Filters outbound branch-to-farmer transfers for distribution and verification views.
- Creates fertilizer distribution records for farmers.
- Sends OTP after a distribution is recorded.
- Allows OTP verification and resend from the modal.
- Refreshes cooperative state after verification actions complete.

---

## 6. National / TCB Dashboard

### Purpose

The national dashboard provides a higher-level Tanzania Coffee Board view of production, fertilizer movement, and regional distribution.

### Implemented Features

- National overview header with language-aware text.
- Privacy mode toggle for admin users.
- Production balance widget.
- National statistics cards for:
  - Total regions
  - Total cooperatives
  - Total production
  - Fertilizer distributed
- Master ledger with batch expansion.
- Regional breakdown for each fertilizer batch.
- Batch status badges for distributed and in-transit records.
- Privacy masking for sensitive numeric details when enabled.

### National Logic

- Uses language context for bilingual labels.
- Detects whether the user has admin access before exposing privacy controls.
- Maintains expandable batch rows for detailed drill-down into regional allocations.
- Displays a master ledger structure that maps national batches to regions and AMCOS units.

---

## 7. Regional Dashboard

### Purpose

The regional dashboard supports incoming batch verification, validation of AMCOS submissions, and issue tracking at the regional office level.

### Implemented Features

- Regional overview header with language-aware text.
- Production balance widget.
- Summary cards for:
  - Active AMCOS
  - Pending batches
  - Pending validations
  - Flagged issues
- Incoming batches list with verification action.
- Recently verified batches list.
- Pending validation queue for AMCOS submissions.
- Flagged issues list with resolution flow.
- Regional production chart and AMCOS status data.
- Digital signature modal for batch verification.

### Regional Logic

- Opens the signature modal when verifying a batch.
- Moves a batch from pending to verified after signature success.
- Approves AMCOS validation records into the ledger.
- Flags suspicious validation records with a reason.
- Allows issue resolution updates for flagged items.

---

## 8. Cooperative Workbench Dashboard

### Purpose

The simpler cooperative workbench view focuses on coffee collection, fertilizer input tracking, and ledger commitment.

### Implemented Features

- Production balance widget.
- Collection and distribution entry form.
- Commit-to-ledger action for new records.
- Recently committed records list.
- Trust seal display for each committed record.
- Summary statistics for farmers, production, fertilizer distribution, and coffee collection.
- Production trend chart.
- Synchronization pulse indicator.
- Recent ledger records section.

### Workbench Logic

- Captures kilogram and bag inputs.
- Validates required fields before committing.
- Creates a new local ledger record with a generated verification ID.
- Prepends committed records to the visible history.
- Links each record to a trust seal for traceability.

---

## 9. Shared Logic and UI Systems

### Language and UI State

- The app uses a shared language context for English and Swahili labels.
- Dashboards adapt their text based on the selected language.
- Shared widgets are reused across national, regional, and cooperative views.

### Shared Components

- Production balance widget for fertilizer vs coffee reconciliation.
- Trust seal component for record integrity display.
- Sync pulse component for network/state visibility.
- Digital signature modal for verification workflows.
- Farmer OTP modal for transfer verification.

### Visual Direction

- Green-themed CoffeeChain branding is applied consistently.
- Dashboards use card-based layouts with charts and status badges.
- Sidebar navigation provides clear access to operational tabs.

---

## 10. Current State Summary

What is done now:

- Public landing page and login flow are in place.
- Authentication is wired to the backend with token-based sessions.
- Role-based dashboard routing is implemented.
- National, regional, supplier, retailer, and cooperative dashboard experiences exist.
- Core business flows are implemented for receipts, dispatches, distributions, OTP verification, batch verification, and ledger-style record keeping.
- Analytics and charting are already present in the main dashboards.
- The app is already structured around the main supply-chain logic for national oversight, regional validation, and AMCOS-level execution.

---

## 11. Notes on Implementation Maturity

- Some screens are fully API-backed and reflect live backend data.
- Some dashboards still contain demo/static seed data for overview and chart widgets.
- The operational flow is already wired, but some screens are primarily presentation layers on top of backend records rather than fully dynamic admin tools.
- The current implementation is strong enough to demonstrate the end-to-end supply-chain workflow from national allocation down to farmer-level distribution and verification.
