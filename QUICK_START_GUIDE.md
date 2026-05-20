# 🚀 Kagera Unified Ledger - Quick Start Guide

## 📱 How to Use the System

### **For All Users**

#### **1. Login**
- Select your level: National (TCB) / Regional (Kagera) / AMCOS (Village)
- Enter username and password
- Click "Login to CoffeeChain"

**Demo Accounts**:
- National Admin: `national_admin` / any password
- National User: `national_user` / any password  
- Regional Officer: `regional_officer` / any password
- AMCOS Manager: `coop_manager` / any password

#### **2. Change Language**
- Look for **EN | SW** toggle in top-right corner
- Click to switch between English and Kiswahili
- All text updates instantly

#### **3. Check Connection Status**
- Look for cloud icon in header
- 🟢 Green "Synced" = Good connection
- 🟡 Yellow "Syncing" = Uploading data
- 🔴 Red "Offline" = No internet

---

### **For National Level Users (Tanzania Coffee Board)**

#### **Dashboard View**
- See national statistics (regions, cooperatives, production)
- View Production Balance Widget (fertilizer vs coffee)
- Check regional performance table
- View production charts

#### **Create Fertilizer Batch**
1. Click **"Batch Dispatch / Tuma Mbolea"** in sidebar
2. Fill form:
   - Fertilizer Type (NPK, DAP, Urea, etc.)
   - Total Bags
   - Region (select Kagera)
   - District (select Bukoba, Ngara, etc.)
   - Truck Number
   - Driver Name
3. Click **"Lock & Dispatch / Funga na Tuma"**
4. Batch ID generated (e.g., TCB-KGR-2026-003)
5. Notification sent to regional office

#### **View Master Ledger**
1. Stay on Dashboard OR click **"Master Ledger"** in sidebar
2. Scroll to "Master Ledger" section
3. Click any batch to expand
4. See regional + AMCOS breakdown
5. View Trust Seal for audit trail

#### **Admin Features** (Super User Only)
- **Privacy Mode**: Toggle ON to mask sensitive farmer data
- **System Governance**: Manage users (coming soon)
- **Audit Trail**: View all system changes (coming soon)

---

### **For Regional Level Users (Kagera Office)**

#### **Dashboard View**
- See Kagera-specific statistics
- View Production Balance Widget
- Check pending batches, validations, and flagged issues
- Monitor all AMCOS cooperatives

#### **Verify Incoming Batch**
1. Scroll to **"Incoming Batches / Mapokezi"** section
2. See yellow card with pending batch details
3. Click **"Verify Batch / Hakiki Kundi"** button
4. Watch Digital Signature animation:
   - Rotating shield icon
   - Progress bar fills
   - Checkmarks appear
5. Batch automatically moves to "Recently Verified"
6. Trust Seal generated

#### **Validate AMCOS Data**
1. Scroll to **"Validation Center / Kituo cha Uhakiki"** table
2. Review each pending validation row
3. For good data: Click **"Approve / Kubali"** (green button)
4. For suspicious data: Click **"Flag / Weka Alama"** (yellow button)
   - Enter reason when prompted
5. Approved data commits to ledger
6. Flagged data moves to "Flagged Issues"

#### **Resolve Flagged Issues**
1. Scroll to **"Flagged Issues"** section
2. Review each red card
3. Click **"Resolve / Tatua"** button
4. Issue marked as resolved

#### **Monitor AMCOS**
- View "AMCOS Status Overview" table
- Check production, pending validations, flagged issues
- See alert icons for cooperatives needing attention

---

### **For AMCOS Level Users (Village Cooperatives)**

#### **Dashboard View**
- See village statistics (farmers, fertilizer, coffee)
- View Production Balance Widget
- Quick entry portal for daily operations
- View recent records with Trust Seals

#### **Register New Farmer**
1. Click **"Farmer Registry / Daftari la Wakulima"** in sidebar
2. Click **"Add Farmer / Ongeza Mkulima"** button
3. Fill form:
   - Full Name
   - Phone Number (+255 7XX XXX XXX)
   - Village
   - Farm Size (hectares)
   - Coffee Variety (Arabica/Robusta/Hybrid)
4. Click **"Register Farmer / Sajili Mkulima"**
5. Farmer appears in table

#### **Search Farmers**
- Use search bar in Farmer Registry
- Type name, ID, or village
- Table filters instantly

#### **Distribute Fertilizer**
1. Click **"Fertilizer Out / Toa Mbolea"** in sidebar
2. Select farmer from dropdown
3. Select fertilizer type
4. Enter number of bags given
5. System shows expected coffee yield (~50kg per bag)
6. Add optional notes
7. Click **"Commit to Ledger / Wasilisha kwa Daftari"**
8. Record ID generated with Trust Seal

#### **Collect Coffee**
1. Click **"Coffee In / Pokea Kahawa"** in sidebar
2. Select farmer from dropdown
3. System shows fertilizer history (bags received)
4. Enter kg collected
5. Select quality grade (AA, A, AB, C)
6. System calculates compliance percentage
7. Click **"Commit to Ledger / Wasilisha kwa Daftari"**
8. Record ID generated with Trust Seal

**⚠️ Important**: If compliance < 90%, record will be flagged for regional validation

#### **View History**
- Click **"History / Kumbukumbu"** in sidebar
- See all today's submitted records
- View Trust Seals for verification

---

## 🎨 Understanding the Visual System

### **Color Codes**
- **Purple**: National Level (TCB)
- **Blue**: Regional Level (Kagera)
- **Green**: Cooperative Level (AMCOS)
- **Yellow**: Pending / Warning
- **Red**: Error / Flagged Issue
- **Gray**: Inactive / Disabled

### **Status Badges**
- 🟢 **Green Badge**: Verified / Distributed / Active
- 🟡 **Yellow Badge**: Pending / In Transit / Review
- 🔴 **Red Badge**: Flagged / Error / Attention Needed

### **Icons**
- 🏠 Home: National Level
- 📍 Map Pin: Regional Level
- 🏢 Building: AMCOS Level
- 🛡️ Shield: Trust Seal / Verification
- ☁️ Cloud: Online Status
- 📦 Package: Fertilizer
- 🌿 Leaf: Coffee
- ✓ Checkmark: Verified
- ⚠️ Warning: Alert
- 🚩 Flag: Flagged Issue

---

## 📊 Understanding Widgets

### **Production Balance Widget**
Shows the fertilizer-to-coffee reconciliation:

```
[Purple Bar: Fertilizer Distributed] ← → [Green Bar: Coffee Harvested]
```

- **Green Solid Line + "Consensus Reached"**: Good! (≥70% compliance)
- **Yellow Broken Line + "Awaiting Validation"**: Warning! (<70% compliance)

**Statistics**:
- **Input**: Fertilizer bags distributed
- **Expected Yield**: Total expected coffee (bags × 50kg)
- **Actual Yield**: Total coffee collected

**Reconciliation Rule**: 1 bag of fertilizer = ~50kg of coffee

---

### **Trust Seal Component**
Verifies data integrity for every record:

```
🛡️ VRF-XXXXXXXX • ✓ Record Secured
[Click "View" to expand details]
```

**Expanded Details**:
- Record ID
- Timestamp
- Verified By: "Kagera Office & TCB"
- Full audit trail

---

### **Synchronization Pulse**
Shows network status of all 3 levels:

```
● National (TCB)       - Connected
● Kagera Region        - Connected  
● AMCOS                - Synced
```

- Dots pulse every 2 seconds
- Shows last sync time at bottom

---

### **Breadcrumb Trace**
Shows your position in the hierarchy:

```
🏠 National (TCB) > 📍 Kagera Region > 🏢 Bukoba AMCOS
```

- Your current level is highlighted in blue
- Always shows full path (National → Regional → AMCOS)

---

## ⚙️ System Settings

### **Language Preferences**
- Toggle anytime between English and Kiswahili
- Setting persists during session
- All UI elements update instantly

### **Privacy Mode** (National Admin Only)
- Toggle to mask sensitive farmer data
- Protects personal information
- Audit trail tracks who viewed data

---

## 🔒 Data Security

### **How Records Are Secured**
1. Each record gets a Verification ID (VRF-XXXXXXXX)
2. Trust Seal attached automatically
3. Timestamp recorded
4. Multi-level verification:
   - AMCOS creates record
   - Regional validates record
   - National oversees everything

### **Offline Protection**
- Data saved locally if no internet
- Auto-syncs when connection restored
- Sync queue shows pending uploads
- No data loss

---

## ❓ Troubleshooting

### **Problem: Can't log in**
- **Solution**: Use any username/password (demo mode)
- Make sure you selected the correct level

### **Problem: Language won't switch**
- **Solution**: Click the EN | SW toggle in top-right corner
- Refresh page if needed

### **Problem: Red "Offline" indicator**
- **Solution**: Check your internet connection
- Data will sync automatically when online
- Continue working, records save locally

### **Problem: Can't find a menu item**
- **Solution**: Check your user level (sidebar shows role-specific menus)
- National, Regional, and AMCOS have different menus

### **Problem: Batch/Record not appearing**
- **Solution**: Wait for sync to complete
- Check "Sync Status" widget in sidebar
- Look for green "Synced" status

### **Problem: Trust Seal won't expand**
- **Solution**: Click "View" button
- Scroll down to see full details

---

## 📞 Support

**Tanzania Coffee Board (TCB)**  
Dodoma/Dar es Salaam, Tanzania

**Kagera Regional Office**  
Bukoba District, Kagera Region

**Technical Support**  
Email: support@kageraledger.go.tz  
Phone: +255 XXX XXX XXX

---

## 🎓 Training Resources

### **Video Tutorials** (Coming Soon)
- How to dispatch batches (National)
- How to verify batches (Regional)
- How to register farmers (AMCOS)
- How to record fertilizer and coffee (AMCOS)

### **User Manuals** (Coming Soon)
- National Level User Guide
- Regional Level User Guide
- AMCOS Level User Guide

---

## 🔑 Quick Reference

| Task | Navigation | Key Fields |
|------|-----------|-----------|
| Create Batch | Sidebar > Batch Dispatch | Fertilizer Type, Bags, Region |
| Verify Batch | Dashboard > Incoming Batches | Click "Verify Batch" |
| Add Farmer | Sidebar > Farmer Registry | Name, Phone, Village |
| Give Fertilizer | Sidebar > Fertilizer Out | Farmer, Type, Bags |
| Collect Coffee | Sidebar > Coffee In | Farmer, Kg, Quality |
| Approve Data | Dashboard > Validation Center | Click "Approve" |
| Flag Issue | Dashboard > Validation Center | Click "Flag" |
| View Ledger | Dashboard > Master Ledger | Click to expand |

---

**Last Updated**: February 20, 2026  
**Version**: 1.0  
**Platform**: Kagera Unified Ledger  
**Languages**: English / Kiswahili

---

*Karibu! / Welcome!* 🎉
