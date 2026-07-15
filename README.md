# CoffeeChain - Trust & Security Platform

![CoffeeChain Logo](https://img.shields.io/badge/CoffeeChain-Trust%20%26%20Security-green?style=for-the-badge)

## Overview

CoffeeChain is a digital trust and traceability platform for fertilizer distribution across Tanzania's coffee-producing regions. It connects suppliers, warehouse managers, retailers, cooperatives (AMCOS), regulators, and administrators in one supply chain with verified receipts, SMS OTP confirmation, and blockchain-backed integrity checks.

**Live demo:** [coffeechain-rust.vercel.app](https://coffeechain-rust.vercel.app)

Farmers do not log in. They are identified by Ministry of Agriculture IDs and confirm fertilizer receipt via SMS OTP.

---

## User Roles

| Role | Purpose |
|------|---------|
| **Admin** | User management, registration approval, reports, chain integrity |
| **Regulator** | Read-only oversight of users, registrations, reports, and integrity |
| **Supplier** | Register batches, manage warehouse stock, dispatch fertilizer, fulfil orders |
| **Warehouse Manager** | Approve incoming dispatches, verify order dispatch, manage inventory |
| **Retailer** | Order from suppliers, receive stock, sell to customers, verify deliveries |
| **Cooperative (AMCOS)** | Same as retailer plus farmer registry and member distribution |

---

## Implemented Features

### Public & Authentication
- Bilingual landing page (English / Swahili)
- Role-based login with JWT session management
- Self-registration (Supplier, Retailer, Cooperative) with admin approval workflow
- Automatic routing to the correct dashboard per role

### Fertilizer Supply Chain
- **Batch registration** with certification status, warehouse location, and lifecycle tracking
- **Direct dispatch** from supplier to retailer or AMCOS
- **Warehouse approval** for incoming supplier transfers
- **Receive fertilizer** flow for retailers and cooperatives
- **Supplier catalog** for retailers/AMCOS to browse stock and place orders (standard and custom)
- **Order workflow:** place order → supplier dispatch from warehouse stock → warehouse manager verification → branch confirms delivery
- **Stock visibility** with available bag counts per batch and warehouse

### Farmer Distribution & Verification
- Farmer registry linked to Ministry of Agriculture IDs (AMCOS)
- Fertilizer distribution to farmers with **SMS OTP verification** (Briq Karibu)
- Retailer walk-in sales with buyer lookup
- **Verification panel** with trust seal and receipt viewer
- Delivery proof upload support

### Trust & Security Layer
- Cryptographic **verification receipts** stored on Storacha/IPFS (with backend fallback)
- Receipt hashes **anchored on Polygon Amoy** blockchain
- **Chain Integrity** panel: scan transfers, detect database tampering, admin/regulator alerts
- Automatic integrity checks on anchored transfer changes
- SMS alerts to admins on tamper detection

### Dashboards & Operations
- Role-specific dashboards with overview metrics and analytics
- In-app **notifications** (orders, dispatches, registrations, integrity events)
- Dispatch history, analytics export (PDF/CSV), and paginated lists
- Issue reporting and resolution (supplier)
- Admin user management, pending registration review, and system reports

### Deployment
- Frontend on **Vercel**
- Backend API and PostgreSQL on **Render**
- Dedicated upload service for receipt storage

---

## Supply Chain Workflow

### Direct dispatch (no order)
1. **Supplier** dispatches batches from warehouse to retailer or AMCOS
2. **Warehouse Manager** approves the transfer (if required)
3. **Retailer/AMCOS** receives and confirms stock
4. **Retailer/AMCOS** distributes to farmer or customer with OTP
5. **System** stores receipt, anchors hash on chain, and records verification

### Order-based flow
1. **Retailer/AMCOS** places order via Supplier Catalog
2. **Supplier** dispatches from warehouse batch stock
3. **Warehouse Manager** verifies dispatch
4. **Retailer/AMCOS** confirms delivery when en route
5. Distribution to farmer follows the same OTP and receipt flow

### Order statuses (unified)
`Pending Review` → `Accepted` → `Awaiting Verification` → `En Route` → `Delivered`

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Tailwind CSS v4 |
| Backend | Django, Django REST Framework, PostgreSQL |
| Auth | JWT (Simple JWT) |
| Blockchain | Polygon Amoy, Solidity smart contract |
| Storage | Storacha/IPFS via upload service |
| SMS | Briq Karibu (OTP and alerts) |
| Charts | Recharts |
| UI | Lucide icons, Radix UI primitives |
| Deploy | Vercel (frontend), Render (API + DB) |

---

## Getting Started

### Local development
1. Clone the repository
2. Backend: `cd backend`, create venv, `pip install -r requirements.txt`, configure `.env`, run migrations, `python manage.py runserver`
3. Frontend: `cd frontend`, `npm install`, set `VITE_API_URL`, `npm run dev`
4. Optional: seed demo data with `python manage.py seed_demo`

### Testing the live demo
See **[docs/TESTING_MANUAL.pdf](docs/TESTING_MANUAL.pdf)** for step-by-step flows, test accounts, and role-by-role instructions.

---

## Project Structure

```
CoffeeChain/
├── backend/           Django API, models, integrity services
├── frontend/          React app and role dashboards
├── upload-service/    Storacha/IPFS receipt upload
├── smart-contracts/   Polygon Amoy audit anchor contract
└── docs/              Architecture docs and testing manual
```

---

## Contact Information

**Project Participants and Contributions**
<<<<<<< HEAD
- **Victor Asel Kabugumila** - Backend Developer & Blockchain integration (TEAM LEAD)
- **Maxmillian Kayombo** - Frontend Developer & UI/UX 
- **Sirili Ammi** - Backend Developer & Co-System Architect
- **Joshua Mbwilo** - Database designer & System Architect
  
- Location: Dar es Salaam, Tanzania
=======

- **Victor Asel Kabugumila** - Backend Developer & Blockchain integration (TEAM LEAD)
- **Maxmillian Kayombo** - Frontend Developer & UI/UX
- **Sirili Ammi** - Backend Developer & Co-System Architect
- **Joshua Mbwilo** - Database designer & System Architect

**Location:** Dar es Salaam, Tanzania
>>>>>>> 78f7ded (updated README)

---

## Documentation

- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Testing Manual (PDF)](docs/TESTING_MANUAL.pdf)

---

## License

© 2026 CoffeeChain Project Team. All rights reserved.

Built for transparent fertilizer distribution and farmer verification in Tanzania's coffee-producing regions.

---

**Built with care for Tanzania's Coffee Farmers**
