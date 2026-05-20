# 🚀 CoffeeChain - Quick Feature Reference Card

## 📱 Demo Accounts

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `national_admin` | any | **Super Admin** | Full system access + governance |
| `national_user` | any | **National User** | Batch dispatch, monitoring, inventory |
| `regional_officer` | any | **Regional Officer** | Verification, validation, allocation |
| `coop_manager` | any | **AMCOS Manager** | Farmer registry, distributions, history |

---

## 🎯 Complete Feature Map

### **National Level (TCB)**

#### **Super Admin Only** 🔑
| Feature | Path | Purpose |
|---------|------|---------|
| **System Governance** | Sidebar → System Governance | Manage users, roles, permissions |
| **Audit Trail** | Sidebar → Audit Trail | View all system activities & logs |
| **Privacy Mode** | Dashboard → Toggle | Mask sensitive farmer data |

#### **All National Users** 👥
| Feature | Path | Purpose |
|---------|------|---------|
| **National Dashboard** | Sidebar → Dashboard | Overview of all regions & production |
| **Master Ledger** | Dashboard OR Sidebar → Master Ledger | View all batches with breakdowns |
| **Batch Dispatch** | Sidebar → Batch Dispatch | Create & send fertilizer batches |
| **Regional Monitoring** | Sidebar → Regional Monitoring | Real-time oversight of all regions |
| **Stock Inventory** | Sidebar → Stock Inventory | National warehouse management |

---

### **Regional Level (Kagera Office)** 🗺️

| Feature | Path | Purpose |
|---------|------|---------|
| **Regional Dashboard** | Sidebar → Dashboard | Kagera-specific metrics & stats |
| **Incoming Batches** | Dashboard → Incoming Batches | Verify batches from TCB |
| **Validation Center** | Dashboard → Validation Center | Approve/flag AMCOS data |
| **AMCOS Allocation** | Dashboard → AMCOS Allocation | Distribute to cooperatives |
| **Kagera Reports** | Sidebar → Reports | Regional analytics |

---

### **AMCOS Level (Cooperative)** 🏘️

| Feature | Path | Purpose |
|---------|------|---------|
| **AMCOS Dashboard** | Sidebar → Dashboard | Village-level overview |
| **Farmer Registry** | Sidebar → Farmer Registry | Add/edit/search farmers |
| **Fertilizer Out** | Sidebar → Fertilizer Out | Record distributions to farmers |
| **Coffee In** | Sidebar → Coffee In | Record collections from farmers |
| **History** | Sidebar → History | View all submitted records |

---

## 🔧 Key Workflows

### **1. User Management** (National Admin)
```
Login → System Governance → Add User → Fill Form → Create User
```
- Add username, name, email, phone, role, region, office
- User appears in table with "Active" status
- Can toggle Active ↔ Suspended
- Can delete with confirmation

---

### **2. Audit Review** (National Admin)
```
Login → Audit Trail → Filter & Search → Export CSV
```
- Search by keyword/record/user
- Filter by action type (Create/Verify/Validate/Flag)
- Filter by user
- View timeline with Trust Seals
- Export to CSV

---

### **3. Stock Check** (National User)
```
Login → Stock Inventory → Review Levels → Check Charts
```
- View 5 fertilizer types
- Check stock levels (progress bars)
- Review "Days Remaining"
- See recent movements
- Analyze monthly flow chart

---

### **4. Regional Oversight** (National User)
```
Login → Regional Monitoring → Filter Region → View Details
```
- Overview of 6 regions
- Filter to specific region
- Review production, compliance, pending tasks
- Check weekly activity chart
- Analyze regional comparison

---

### **5. Batch Dispatch** (National User)
```
Login → Batch Dispatch → Create Batch → Lock & Dispatch
```
- Select fertilizer type (NPK, DAP, Urea, etc.)
- Enter total bags
- Choose region (Kagera, Kilimanjaro, etc.)
- Select district (Bukoba, Ngara, etc.)
- Enter truck & driver details
- Click "Lock & Dispatch"
- Batch sent to regional office

---

### **6. Batch Verification** (Regional Officer)
```
Login → Dashboard → Incoming Batches → Verify Batch
```
- See pending batches (yellow cards)
- Review batch details
- Click "Verify Batch"
- Watch Digital Signature animation (2.5s)
- Batch moves to "Recently Verified"

---

### **7. Data Validation** (Regional Officer)
```
Login → Dashboard → Validation Center → Approve/Flag
```
- Review pending validations from AMCOS
- For good data: Click "Approve" → Commits to ledger
- For suspicious data: Click "Flag" → Enter reason → Moves to issues
- Resolve flagged issues when ready

---

### **8. Farmer Registration** (AMCOS Manager)
```
Login → Farmer Registry → Add Farmer → Fill Form → Register
```
- Enter name, phone, village, farm size, coffee variety
- Click "Register Farmer"
- Farmer appears in table
- Search using search bar

---

### **9. Fertilizer Distribution** (AMCOS Manager)
```
Login → Fertilizer Out → Select Farmer → Enter Details → Commit
```
- Choose farmer from dropdown
- Select fertilizer type
- Enter bags given
- System shows expected yield (~50kg per bag)
- Click "Commit to Ledger"
- Record created with Trust Seal

---

### **10. Coffee Collection** (AMCOS Manager)
```
Login → Coffee In → Select Farmer → Enter Details → Commit
```
- Choose farmer from dropdown
- System shows fertilizer history
- Enter kg collected
- Select quality grade (AA/A/AB/C)
- System calculates compliance %
- Click "Commit to Ledger"
- Record created with Trust Seal
- ⚠️ If <90%, flagged for regional validation

---

### **11. View History** (AMCOS Manager)
```
Login → History → Filter & Search → View Records
```
- See all submitted records (fertilizer + coffee + farmers)
- Search by farmer name/ID/product
- Filter by type (Fertilizer/Coffee/Registration)
- Filter by date (All/Today/Week/Month)
- Expand Trust Seals to verify

---

## 📊 Widget Guide

### **Production Balance Widget**
Shows fertilizer-to-coffee reconciliation:
```
[Purple: Fertilizer] ◄─────► [Green: Coffee]
```
- **Green Line + "Consensus Reached"** = ≥70% compliance ✅
- **Yellow Line + "Awaiting Validation"** = <70% compliance ⚠️

**Stats**:
- Input: Fertilizer bags distributed
- Expected: Total expected coffee (bags × 50kg)
- Actual: Total coffee collected

---

### **Trust Seal**
Verifies data integrity:
```
🛡️ VRF-XXXXXXXX • ✓ Record Secured
```
Click "View" to expand:
- Record ID
- Timestamp
- Verified By
- Full audit trail

---

### **Synchronization Pulse**
Shows network status:
```
● National (TCB)       - Connected
● Kagera Region        - Connected
● AMCOS                - Synced
```
- Dots pulse every 2 seconds
- Last sync time at bottom

---

### **Breadcrumb Trace**
Shows hierarchy:
```
🏠 National (TCB) > 📍 Kagera Region > 🏢 Bukoba AMCOS
```
- Current level highlighted in blue
- Always shows full path

---

### **Offline Indicator**
Shows connection status:
```
☁️ Synced      (Green)
☁️ Syncing...  (Yellow)
☁️ Offline     (Red)
```
- Located in header (top-right)

---

## 🎨 Color Code

| Color | Meaning | Usage |
|-------|---------|-------|
| 🟣 Purple | National Level | TCB features |
| 🔵 Blue | Regional Level | Kagera features |
| 🟢 Green | AMCOS Level | Cooperative features |
| 🟡 Yellow | Warning/Pending | Needs attention |
| 🔴 Red | Error/Critical | Urgent action |
| ⚪ Gray | Inactive/Disabled | Not available |

---

## 📈 Chart Types

| Chart | Location | Purpose |
|-------|----------|---------|
| **Bar Chart** | National Dashboard | Regional production comparison |
| **Line Chart** | National Dashboard | Monthly production trend |
| **Bar Chart** | Regional Monitoring | Regional production vs fertilizer |
| **Line Chart** | Regional Monitoring | Weekly activity (batches, validations, issues) |
| **Bar Chart** | Stock Inventory | Monthly stock flow (inbound vs outbound) |
| **Horizontal Bar** | Stock Inventory | Inventory by fertilizer type |
| **Bar Chart** | AMCOS Dashboard | Weekly production trend |

---

## 🔔 Notifications & Alerts

### **Yellow Badges** (Warning)
- Pending batches (Regional)
- Low stock items (National)
- Below compliance (<90%)

### **Red Badges** (Critical)
- Flagged issues (Regional)
- Critical stock levels (National)
- Suspended users (Admin)

### **Green Badges** (Success)
- Verified batches
- Active users
- Good compliance (≥90%)

---

## 🌍 Language Toggle

**Location**: Header (top-right)

```
EN | SW
```

- Blue background = Active language
- Click to switch instantly
- All text updates in real-time

---

## 💾 Data Persistence

### **Offline Mode**
- Records save locally if offline
- Auto-sync when connection restored
- Sync queue shows pending uploads
- No data loss

### **Trust Seals**
- Every record gets a Verification ID
- Timestamp recorded
- Multi-level verification
- Immutable audit trail

---

## ⚡ Quick Tips

1. **Search Farmers**: Use search bar in Farmer Registry
2. **Filter Logs**: Use dropdowns in Audit Trail
3. **Check Stock**: Look for red progress bars in Stock Inventory
4. **Monitor Regions**: Use filter in Regional Monitoring
5. **View History**: Filter by date in History component
6. **Export Data**: Click "Export CSV" in Audit Trail
7. **Verify Records**: Click "View" on any Trust Seal
8. **Change Language**: Click EN | SW toggle anytime
9. **Add Users**: Click "Add User" in System Governance
10. **Approve Quickly**: Use "Approve" button in Validation Center

---

## 📞 Support

**Tanzania Coffee Board (TCB)**  
National Office, Tanzania

**Technical Support**  
Email: support@coffeechain.go.tz  
Phone: +255 XXX XXX XXX

---

**Platform**: CoffeeChain  
**Version**: 1.0  
**Languages**: English / Kiswahili  
**Status**: ✅ Production Ready

---

*Karibu! / Welcome!* ☕🌱
