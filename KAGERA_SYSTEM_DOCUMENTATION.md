# Kagera Unified Ledger - Complete System Documentation

## 📋 Executive Summary

**Kagera Unified Ledger** is a bilingual (English/Kiswahili) trust-based platform for managing fertilizer distribution and coffee collection records for cooperatives in Tanzania's Kagera Region. The system ensures data integrity and transparency through a three-tier hierarchical architecture with cryptographic verification.

**Core Focus**: Fertilizer-to-Coffee Reconciliation (No payment processing)

---

## 🌍 Kagera Context

### Geographic Scope
- **Primary Region**: Kagera Region, Northwestern Tanzania
- **District Focus**: Bukoba District
- **Target Users**: Tanzania Coffee Board (TCB), Kagera Regional Office, Village-level AMCOS cooperatives

### Language Support
- **Bilingual Interface**: English and Kiswahili side-by-side
- **Toggle Feature**: EN | SW switcher in header (top-right)
- **All UI Elements**: Labels, buttons, tables, messages translated
- **Dynamic Translation**: Real-time language switching without page reload

---

## 🎨 Design Principles

### Visual Identity
✅ **No Gradients** - Solid colors only, professional government aesthetics  
✅ **Trust & Security Language** - Replaced "blockchain" terminology with "Trust Seal", "Verification", "Ledger"  
✅ **Bilingual Throughout** - Every screen, button, and label in both languages  
✅ **Offline Support** - Visual indicator for poor internet connectivity (rural Kagera)  
✅ **Simplified Scope** - ONLY Fertilizer Distribution + Coffee Collection

### Color Scheme
- **National Level (TCB)**: Purple (#7c3aed, #a855f7)
- **Regional Level (Kagera)**: Blue (#3b82f6, #2563eb)
- **Cooperative Level (AMCOS)**: Green (#16a34a, #22c55e)
- **Verification/Trust**: Green accents for verified data
- **Warnings**: Yellow (#eab308) for discrepancies

---

## 🏗️ System Architecture

### Three-Tier Hierarchical Structure

```
┌────────────────────────────────────────────────┐
│   NATIONAL LEVEL (Tanzania Coffee Board)      │
│   - Dodoma/Dar es Salaam                       │
│   - Super Admin + Standard Users               │
│   - Master Ledger & Audit Trail                │
└───────────────┬────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
┌───────▼──────────┐     │
│ REGIONAL LEVEL   │     │
│ (Kagera - Bukoba)│     │
│ - Batch Verify   │     │
│ - AMCOS Allocate │     │
└────────┬─────────┘     │
         │               │
    ┌────┴─────┐         │
    │          │         │
┌───▼────┐ ┌──▼────┐    │
│ AMCOS  │ │ AMCOS │    │
│Village │ │Village│    │
└────────┘ └───────┘    │
```

### Data Flow: Top-Down Injection

**Step 1: National TCB**
- Admin creates fertilizer batch (e.g., "TCB-KGR-2026-001")
- Specifies: Fertilizer Type, Total Bags, Destination (Kagera)
- Clicks "Lock & Dispatch / Funga na Tuma"
- Generates first ledger entry

**Step 2: Regional Kagera Office**
- Receives "Pending Batch" alert
- Views truck details and bag count
- Clicks "Confirm Receipt & Authenticate / Thibitisha Mapokezi na Hakiki"
- Digital Signature animation plays
- Batch verified and allocated to AMCOS cooperatives

**Step 3: AMCOS Village Level**
- Receives allocated fertilizer bags
- Records daily operations:
  - **Fertilizer Out**: Bags given to specific farmers
  - **Coffee In**: Kg collected from specific farmers
- System tracks yield expectation (1 bag = ~50kg coffee)

---

## 🛠️ New UI Components

### 1. **Bilingual Toggle** (`bilingual-toggle.jsx`)
**Location**: Top-right of header, next to notifications

**Features**:
- Languages icon (🌐)
- "EN | SW" toggle
- Active language highlighted in blue
- Instant language switching

**Usage**:
```jsx
import { BilingualToggle } from './bilingual-toggle';
<BilingualToggle />
```

### 2. **Offline Indicator** (`offline-indicator.jsx`)
**Location**: Header, left of bilingual toggle

**Features**:
- Cloud icon (☁️) when online
- Cloud with slash (⛔☁️) when offline
- Color-coded status:
  - 🟢 Green: "Synced" (Imesawazishwa)
  - 🟡 Yellow: "Syncing" (Inasawazisha)
  - 🔴 Red: "Offline" (Nje ya Mtandao)
- Auto-detects network status

**Purpose**: Critical for Kagera rural areas with unreliable internet

### 3. **Trust Seal** (`trust-seal.jsx`)
**Location**: Below every ledger record

**Features**:
- Replaces "Hash Trail" with "Trust Seal" terminology
- Shield icon (🛡️) in purple
- Verification ID: `VRF-XXXXXXXX` (not blockchain hash)
- Expandable details:
  - Record ID
  - Timestamp
  - Verified By: "Kagera Office & TCB"
- Green checkmark for verified status

**Example**:
```jsx
<TrustSeal 
  recordId="REC-123456789" 
  timestamp="2026-02-20 14:30" 
  verifiedBy="Kagera Office & TCB" 
/>
```

### 4. **Synchronization Pulse** (`sync-pulse.jsx`)
**Location**: Dashboard sidebar (right column)

**Features**:
- Replaces "Node Status" with "Synchronization Status"
- Three levels displayed:
  - 🟣 National (TCB) - Purple dot
  - 🔵 Kagera Region - Blue dot
  - 🟢 AMCOS - Green dot
- Animated pulsing dots (2-second loop)
- Status for each: "Connected" / "Synced" / "Offline"
- Last Sync timestamp at bottom

**Purpose**: Visualizes distributed ledger without technical jargon

### 5. **Production Balance Widget** (`production-balance.jsx`)
**Location**: Top of all dashboards

**Features**:
- Horizontal progress bar showing fertilizer-to-coffee ratio
- **Left Side (Purple)**: Fertilizer Distributed (bags)
- **Right Side (Green)**: Coffee Harvested (kg)
- **Center Connection**:
  - Green solid line + "Consensus Reached" if ratio is good (≥70%)
  - Yellow broken line + "Awaiting Validation" if discrepancy (<70%)
- **Statistics**:
  - Input (bags)
  - Expected Yield (kg)
  - Actual Yield (kg)
- **Reconciliation Rule**: 1 bag fertilizer = ~50kg coffee
- Warning indicator if mismatch

**Example**:
```jsx
<ProductionBalance 
  fertilizerBags={500} 
  coffeeKg={22500}  // 500 * 50 = 25,000 expected, so 90% compliance
/>
```

### 6. **Breadcrumb Trace** (`breadcrumb-trace.jsx`)
**Location**: Below header, above main content

**Features**:
- Always shows full hierarchy: National (TCB) → Kagera Region → AMCOS
- Icons for each level: 🏠 Home, 📍 Map Pin, 🏢 Building
- Current user's level highlighted in blue
- Distributed ledger indicator (3 green dots) at bottom
- Non-clickable (informational only)

**Example Display**:
- National user: `🏠 National (TCB)`
- Regional user: `🏠 National (TCB) > 📍 Kagera Region`
- AMCOS user: `🏠 National (TCB) > 📍 Kagera Region > 🏢 Bukoba AMCOS`

---

## 👥 User Roles & Navigation

### A. National Level (TCB - Dodoma/Dar)

#### **Super Admin (National Admin)**
Username: `national_admin`

**Navigation Menu**:
1. **Dashboard / Muhtasari** - Full national overview
2. **System Governance / Usimamizi wa Mfumo** - Manage regional users & sensitive data
3. **Master Ledger / Daftari Kuu** - Source of truth for all fertilizer batches
4. **Audit Trail / Ukaguzi** - Review who changed what and when
5. **Global Reports / Ripoti za Taifa** - Kagera vs other regions

**Permissions**:
- View all national data
- Manage regional user accounts
- Access sensitive data (with privacy toggle)
- Generate national reports
- Master ledger access

#### **Standard National User**
Username: `national_user`

**Navigation Menu**:
1. **Dashboard / Muhtasari** - National overview
2. **Batch Dispatch / Tuma Mbolea** - Create fertilizer batches for Kagera
3. **Regional Monitoring / Fuatilia Mikoa** - Monitor Kagera and other regions
4. **Stock Inventory / Ghala la Taifa** - National fertilizer inventory

**Permissions**:
- Create and dispatch fertilizer batches
- Monitor regional activity
- View inventory levels
- Read-only verification

### B. Regional Level (Kagera Office - Bukoba)

Username: `regional_officer`

**Navigation Menu**:
1. **Dashboard / Muhtasari** - Kagera-specific stats
2. **Incoming Batches / Mapokezi** - Verify fertilizer arriving from TCB
3. **AMCOS Allocation / Gawio la AMCOS** - Assign bags to specific cooperatives
4. **Validation Center / Kituo cha Uhakiki** - Approve/Flag data from AMCOS
5. **Kagera Reports / Ripoti za Mkoa** - Regional performance reports

**Permissions**:
- Verify incoming national batches
- Allocate fertilizer to AMCOS
- Validate AMCOS data submissions
- Flag discrepancies
- Generate regional reports

### C. Cooperative Level (AMCOS - Village)

Username: `coop_manager`

**Navigation Menu**:
1. **Dashboard / Muhtasari** - Simple daily stats
2. **Farmer Registry / Daftari la Wakulima** - List of farmers in village
3. **Fertilizer Out / Toa Mbolea** - Record bags given to farmer
4. **Coffee In / Pokea Kahawa** - Record Kg collected from farmer
5. **History / Kumbukumbu** - View today's saved records

**Permissions**:
- Register farmers
- Record fertilizer distribution
- Record coffee collection
- View own cooperative's data
- Submit data for validation

---

## 📊 Dashboard Features

### AMCOS Dashboard (Cooperative Level)

**1. Production Balance Widget**
- Shows fertilizer bags distributed vs coffee collected
- Visual progress bar with reconciliation status

**2. Collection & Distribution Portal**
- **Large Input Fields**:
  - Left: Kilograms Collected (green Leaf icon)
  - Right: Bags Distributed (blue Package icon)
- **"Commit to Ledger" Button** (purple, full-width)
- Generates verification ID on submission

**3. Recently Committed Records**
- Shows last submitted records
- Each record displays:
  - Record ID
  - Status badge (committed, verified)
  - Timestamp
  - Coffee collected (kg)
  - Bags distributed
  - Trust Seal component (expandable)

**4. Statistics Cards (4 Cards)**
- Active Farmers / Wakulima Hai
- Total Production / Jumla ya Uzalishaji
- Fertilizer Distributed / Mbolea Iliyogawanywa
- Coffee Collected / Kahawa Iliyokusanywa

**5. Production Trend Chart**
- Line chart: 7 months of production data
- Green line (#16a34a)

**6. Synchronization Pulse**
- Right sidebar showing network status

**7. Recent Ledger Records Table**
- Bilingual column headers
- Columns: Record ID, Type, Farmer, Amount, Status, Verification ID
- Color-coded status badges

### Regional Dashboard (Kagera Office)

**1. Production Balance Widget**
- Regional-level aggregation

**2. Logistics Verification Section**
- **Pending Batches** cards showing:
  - Batch ID (e.g., TCB-KGR-2026-001)
  - Fertilizer type (NPK 20-10-10, DAP, Organic)
  - Quantity (bags)
  - Status: "Pending Verification" (yellow)
  - Source: National TCB
  - Destination: Kagera Region
- **"Verify Batch" Button** (blue, large)

**3. Digital Signature Animation**
When "Verify Batch" clicked:
- Full-screen modal overlay (semi-transparent black)
- White card in center with:
  - Rotating Shield icon (360° animation)
  - Title: "Generating Digital Signature / Kutengeneza Saini ya Kidijitali"
  - Message: "Creating cryptographic proof... / Kuunda ushahidi wa kriptografia..."
  - 3 steps with sequential checkmarks:
    - ✓ Validating batch data
    - ✓ Computing verification code
    - ✓ Broadcasting to network
  - Progress bar (fills over 2.5 seconds)
- On completion:
  - Modal closes
  - Batch marked as "Verified"
  - Success notification
  - Verification ID displayed

**4. Pending Validations Table**
- Shows data submitted by AMCOS cooperatives
- Columns: ID, Cooperative, Type, Details, Submitted Date
- Action buttons per row:
  - 🟢 "Approve / Kubali" (green) - Commits to ledger
  - 🟡 "Flag / Weka Alama" (yellow) - Opens reason prompt
- Interactive approval/flagging workflow

**5. Flagged Issues Section**
- Lists issues flagged by officers
- Each issue shows:
  - Flag icon (🚩)
  - Issue ID
  - Severity badge
  - Description
  - AMCOS name
  - Date
  - **"Resolve / Tatua" button**

**6. AMCOS Status Overview Table**
- Lists all cooperatives in Kagera
- Columns:
  - AMCOS name
  - Production (kg)
  - Status (validated/pending)
  - Pending count
  - Flagged count (with alert icon if > 0)

**7. Synchronization Pulse**
- Network status widget

### National Dashboard (TCB)

**1. Production Balance Widget**
- National-level aggregation (all regions)

**2. Master Ledger Table**
- Shows all fertilizer batches dispatched
- **Expandable Rows**:
  - Click ChevronRight to expand
  - Shows breakdown by:
    - Regions that received batch
    - AMCOS within each region
    - Quantity per location
- Columns:
  - Batch ID
  - Fertilizer Type
  - Total Quantity (bags)
  - Status (distributed, in-transit)
  - Injected Date
- Trust Seal at bottom of each expanded row

**Example Expanded Row**:
```
BATCH-001 expanded:
├── Kagera Region (500 bags)
│   ├── Bukoba AMCOS (200 bags)
│   └── Ngara AMCOS (300 bags)
└── Mwanza Region (300 bags)
    └── Mwanza Central AMCOS (300 bags)

Trust Seal: VRF-12345678 | Verified
```

**3. Regional Performance Table**
- Lists all regions (Kagera, Kilimanjaro, Mwanza, etc.)
- Columns:
  - Region name
  - AMCOS count
  - Production (kg)
  - Fertilizer distributed (bags)
  - Compliance rate (%)
  - Status

**4. Statistics Cards**
- Total Regions
- Total AMCOS Cooperatives
- National Production (kg)
- Fertilizer Distributed (bags)

**5. Synchronization Pulse**
- Shows all three levels synced

---

## 🔄 Complete Functional Workflow

### Workflow: Fertilizer Batch from TCB to AMCOS

**Phase 1: National Dispatch (TCB)**
1. National user logs into system
2. Navigates to "Batch Dispatch / Tuma Mbolea"
3. Fills dispatch form:
   - Fertilizer Type: NPK 20-10-10
   - Total Bags: 500
   - Region: Kagera
   - Dispatch Date: 2026-02-20
4. Clicks "Lock & Dispatch / Funga na Tuma"
5. System generates Batch ID: `TCB-KGR-2026-001`
6. Creates first ledger entry
7. Status: "In-Transit"
8. Notification sent to Kagera Regional Office

**Phase 2: Regional Verification (Kagera - Bukoba)**
1. Kagera officer logs in
2. Sees alert: "1 batch pending verification"
3. Navigates to "Incoming Batches / Mapokezi"
4. Reviews batch card:
   - Batch ID: TCB-KGR-2026-001
   - Fertilizer: NPK 20-10-10
   - Quantity: 500 bags
   - Source: National TCB
   - Destination: Kagera
5. Clicks "Verify Batch / Hakiki Kundi"
6. Digital Signature Animation plays (2.5 seconds)
   - Rotating shield
   - Progress bar fills
   - Sequential checkmarks appear
7. Success message: "Batch committed to ledger! / Kundi limewasilishwa kwa daftari!"
8. Batch status changes to "Verified"
9. Verification ID generated: VRF-20260220
10. Officer navigates to "AMCOS Allocation / Gawio la AMCOS"
11. Allocates bags to cooperatives:
    - Bukoba AMCOS: 200 bags
    - Ngara AMCOS: 300 bags
12. Notifications sent to AMCOS managers

**Phase 3: AMCOS Distribution (Village Level)**
1. AMCOS manager logs in
2. Sees notification: "200 bags fertilizer allocated"
3. Navigates to "Farmer Registry / Daftari la Wakulima"
4. Confirms farmer list (342 active farmers)
5. Navigates to "Fertilizer Out / Toa Mbolea"
6. Records distribution:
   - Farmer: John Kamau (F-2401)
   - Bags Given: 5
   - Date: 2026-02-20
7. Clicks "Commit to Ledger / Wasilisha kwa Daftari"
8. System generates Record ID: REC-1708437210
9. Verification ID: VRF-37210
10. Trust Seal attached
11. Data submitted to Regional for validation

**Phase 4: Coffee Collection (AMCOS)**
1. Manager navigates to "Coffee In / Pokea Kahawa"
2. Records collection:
   - Farmer: John Kamau (F-2401)
   - Kg Collected: 245 kg
   - Quality Grade: AA
   - Date: 2026-05-15 (harvest season)
3. Clicks "Commit to Ledger / Wasilisha kwa Daftari"
4. System checks reconciliation:
   - 5 bags fertilizer given → Expected: 250 kg coffee
   - Actual: 245 kg → 98% compliance
   - Status: ✅ Good
5. Record committed with Trust Seal

**Phase 5: Regional Validation (Kagera)**
1. Regional officer sees "Pending Validation"
2. Reviews AMCOS submission
3. Verifies data integrity
4. Clicks "Approve / Kubali"
5. Confirmation dialog appears
6. Officer confirms approval
7. Data committed to regional ledger
8. Trust Seal updated: "Verified by Kagera Office"
9. Data flows to National Master Ledger

**Phase 6: National Oversight (TCB)**
1. National admin logs in
2. Navigates to "Master Ledger / Daftari Kuu"
3. Expands Batch TCB-KGR-2026-001
4. Sees complete audit trail:
   - Dispatched: 2026-02-20
   - Verified by Kagera: 2026-02-21
   - Allocated to AMCOS: 2026-02-21
   - Distributed to farmers: 2026-02-22 to 2026-03-15
   - Coffee collected: 2026-05-10 to 2026-06-20
   - Total fertilizer: 500 bags
   - Total coffee: 24,350 kg
   - Expected: 25,000 kg
   - Compliance: 97.4%
5. Production Balance shows green "Consensus Reached"
6. Full transparency achieved

---

## 🔐 Privacy & Security Features

### Admin Privacy Toggle
**Available to**: National Super Admin only

**Purpose**: Protect sensitive data (farmer IDs, personal information)

**Features**:
- Toggle switch in header: "Privacy Mode / Hali ya Faragha"
- When enabled:
  - Farmer IDs masked: `F-****01`
  - Names partially hidden: `John K.`
  - Phone numbers hidden: `+255 *** *** 789`
- When disabled (authorized only):
  - Full data visible
- Audit log tracks who viewed sensitive data

### Offline Data Handling
**Challenge**: Kagera rural areas have poor internet

**Solutions**:
1. **Offline Indicator**: Always visible in header
2. **Local Storage**: Data saved locally when offline
3. **Auto-Sync**: When connection restored, data syncs automatically
4. **Sync Queue**: Shows pending records to upload
5. **Conflict Resolution**: If data conflicts detected, flag for review

---

## 📱 Responsive Design

**Primary Target**: Desktop/Laptop (1024px+)  
**Secondary**: Tablet (768-1023px)  
**Limited Support**: Mobile (< 768px)

**Responsive Breakpoints**:
- Sidebar collapses on tablet
- Tables scroll horizontally on mobile
- Cards stack vertically
- Production Balance adjusts width
- Charts resize responsively

---

## 🌐 Translation System

### Language Context (`language-context.jsx`)

**Features**:
- React Context API for global language state
- `translations` object with English and Kiswahili keys
- `useLanguage()` hook provides:
  - `language`: Current language ('en' or 'sw')
  - `t(key)`: Translate function
  - `toggleLanguage()`: Switch language

**Usage in Components**:
```jsx
import { useLanguage } from './language-context';

function MyComponent() {
  const { t, language } = useLanguage();
  
  return (
    <div>
      <h1>{t('dashboard')}</h1>
      <p>{language === 'en' ? 'Welcome' : 'Karibu'}</p>
    </div>
  );
}
```

**Translation Keys** (Sample):
- `dashboard` → "Dashboard" / "Muhtasari"
- `masterLedger` → "Master Ledger" / "Daftari Kuu"
- `fertilizerOut` → "Fertilizer Out" / "Toa Mbolea"
- `coffeeIn` → "Coffee In" / "Pokea Kahawa"
- `activeFarmers` → "Active Farmers" / "Wakulima Hai"
- `commitToLedger` → "Commit to Ledger" / "Wasilisha kwa Daftari"

---

## 📈 Key Performance Indicators (KPIs)

### AMCOS Level
- Active Farmers count
- Fertilizer distributed (bags)
- Coffee collected (kg)
- Compliance rate (actual vs expected yield)

### Regional Level (Kagera)
- Total AMCOS cooperatives
- Batches verified this week
- Pending validations count
- Flagged issues count
- Regional production (kg)

### National Level (TCB)
- Total regions active
- Total AMCOS nationwide
- National production (kg)
- Fertilizer distributed nationally
- System-wide compliance rate
- Data integrity percentage

---

## 🚀 Future Enhancements

### Phase 2 Features
1. **Mobile App**: Android app for farmers (direct data entry)
2. **SMS Notifications**: Kiswahili SMS alerts for farmers
3. **QR Codes**: Scan fertilizer bag QR codes for traceability
4. **Weather Integration**: Link fertilizer use to rainfall data
5. **Market Prices**: Show coffee prices in real-time

### Phase 3 Features
1. **Smart Contracts**: Automatic compliance checks
2. **Biometric Verification**: Fingerprint for farmer authentication
3. **Satellite Imagery**: Verify farm size and production capacity
4. **AI Fraud Detection**: Flag unusual patterns
5. **Multi-region Expansion**: Roll out to Kilimanjaro, Mbeya, etc.

---

## 📁 File Structure (Updated)

```
/src
├── /app
│   ├── App.jsx                              # Main app with LanguageProvider
│   ├── App.tsx                              # TypeScript export
│   └── /components
│       ├── bilingual-toggle.jsx             # NEW: EN/SW language toggle
│       ├── breadcrumb-trace.jsx             # NEW: Hierarchical breadcrumb
│       ├── dashboard.jsx                    # AMCOS dashboard (updated)
│       ├── language-context.jsx             # NEW: Translation context
│       ├── login.jsx                        # Updated with bilingual support
│       ├── national-dashboard.jsx           # TCB dashboard (to be updated)
│       ├── offline-indicator.jsx            # NEW: Network status
│       ├── production-balance.jsx           # NEW: Fertilizer-to-coffee widget
│       ├── regional-dashboard.jsx           # Kagera dashboard (to be updated)
│       ├── sidebar.jsx                      # Updated with role-specific menus
│       ├── sync-pulse.jsx                   # NEW: Sync status widget
│       ├── trust-seal.jsx                   # NEW: Verification component
│       ├── header.jsx                       # Updated with new indicators
│       └── /ui                              # Radix UI components
│           ├── button.tsx
│           ├── card.tsx
│           └── ... (existing UI components)
├── /styles
│   ├── fonts.css
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css
└── /imports                                 # Figma assets (if any)
```

---

## ✅ Completed Redesign Features

### ✅ Bilingual Support
- [x] Language Context created
- [x] Bilingual Toggle component
- [x] 100+ translation keys (EN/SW)
- [x] Login screen bilingual
- [x] Sidebar navigation bilingual
- [x] Dashboard bilingual
- [x] All new components bilingual

### ✅ Trust & Security Language
- [x] "Blockchain" → "Ledger" / "Daftari"
- [x] "Hash Trail" → "Trust Seal" / "Muhuri wa Uaminifu"
- [x] "Block Hash" → "Verification ID" / "Nambari ya Uthibitisho"
- [x] "Node Status" → "Synchronization Status" / "Hali ya Usawazishaji"
- [x] "Commit to Blockchain" → "Commit to Ledger" / "Wasilisha kwa Daftari"

### ✅ New UI Components
- [x] Bilingual Toggle (EN | SW)
- [x] Offline Indicator (Cloud icon with status)
- [x] Trust Seal (Verification component)
- [x] Synchronization Pulse (Network status widget)
- [x] Production Balance (Fertilizer-to-coffee reconciliation)
- [x] Breadcrumb Trace (Hierarchical navigation)

### ✅ Updated Components
- [x] Header (with bilingual toggle + offline indicator)
- [x] Sidebar (role-specific menus, bilingual labels)
- [x] Dashboard (AMCOS level with bilingual support)
- [x] Login (Kagera context, bilingual)
- [x] App.jsx (wrapped with LanguageProvider)

### ⏳ Pending Components (To Be Updated)
- [ ] National Dashboard (Master Ledger table)
- [ ] Regional Dashboard (Incoming Batches, Validation Center)
- [ ] Batch Dispatch Form (National level)
- [ ] AMCOS Allocation (Regional level)
- [ ] Farmer Registry (AMCOS level)
- [ ] Fertilizer Out Form (AMCOS level)
- [ ] Coffee In Form (AMCOS level)
- [ ] Digital Signature Animation (Regional verification)
- [ ] Audit Trail (National Admin only)
- [ ] System Governance (National Admin only)

---

## 🎯 Scope: Fertilizer → Coffee ONLY

### ✅ Included Features
- Fertilizer batch creation (National)
- Batch verification (Regional)
- AMCOS allocation (Regional)
- Fertilizer distribution to farmers (AMCOS)
- Coffee collection from farmers (AMCOS)
- Reconciliation tracking (all levels)
- Data validation (Regional)
- Master Ledger (National)
- Audit Trail (National Admin)

### ❌ Excluded Features (Out of Scope)
- ~~Payment processing~~
- ~~Payment records~~
- ~~Farmer payment tracking~~
- ~~Financial transactions~~
- ~~Subsidy allocation~~ (Removed - replaced with direct fertilizer batches)
- ~~Bank transfers~~
- ~~Mobile money~~

---

## 📞 Support & Contact

**Tanzania Coffee Board (TCB)**  
Dodoma/Dar es Salaam, Tanzania

**Kagera Regional Office**  
Bukoba District, Kagera Region

**Technical Support**  
Email: support@kageraledger.go.tz  
Phone: +255 XXX XXX XXX

---

**Document Version**: 2.0 (Kagera Redesign)  
**Last Updated**: February 20, 2026  
**Platform**: Kagera Unified Ledger - Trust & Security Platform  
**Languages**: English / Kiswahili (Bilingual)
