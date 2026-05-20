# CoffeeChain System Overview

## 🌍 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PUBLIC LANDING PAGE                    │
│              (No Login Required - Swahili)              │
│                                                          │
│  • About CoffeeChain                                    │
│  • Features & Services                                  │
│  • How It Works                                         │
│  • Contact Information                                  │
│                                                          │
│              [Ingia Mfumo Button]                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      LOGIN SYSTEM                        │
│                                                          │
│  Role Selection:                                        │
│  ✓ Admin          (System Administrator)               │
│  ✓ Supplier       (Fertilizer Supplier)                │
│  ✓ Retailer       (Retail Shop)                        │
│  ✓ Cooperative    (AMCOS)                              │
│                                                          │
│  Authentication: username + password (demo123)          │
└─────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌───────────────────────┐       ┌───────────────────────┐
│   ADMIN DASHBOARD     │       │  SUPPLIER DASHBOARD   │
├───────────────────────┤       ├───────────────────────┤
│ • System Metrics      │       │ • Dispatch Batches    │
│ • All Users Overview  │       │ • Inventory           │
│ • Charts & Analytics  │       │ • Delivery Status     │
│ • Regional Data       │       │ • History             │
│ • Activity Feed       │       └───────────────────────┘
└───────────────────────┘                   ↓
            ↓                               ↓
┌───────────────────────┐       ┌───────────────────────┐
│ RETAILER DASHBOARD    │←──────│ FERTILIZER BATCHES    │
├───────────────────────┤       └───────────────────────┘
│ • Receive Batches     │                   ↓
│ • Stock Management    │       ┌───────────────────────┐
│ • Distribute to       │       │ COOPERATIVE DASHBOARD │
│   Farmers (OTP)       │       ├───────────────────────┤
│ • Farmer Registry     │       │ • Member Farmers      │
└───────────────────────┘       │ • Receive Fertilizer  │
            ↓                   │ • Distribute (OTP)    │
            └───────────────────→ • Collect Coffee      │
                                │ • Transaction History │
                                └───────────────────────┘
                                            ↓
                                ┌───────────────────────┐
                                │   FARMER DATA         │
                                │ (Seeded - No Login)   │
                                ├───────────────────────┤
                                │ • 15 Farmers          │
                                │ • Ministry IDs        │
                                │ • 3 Cooperatives      │
                                │ • Kagera Region       │
                                └───────────────────────┘
```

---

## 👥 User Hierarchy

### Level 1: National (Admin)
```
Tanzania Coffee Board (TCB)
└── Dr. Joseph Mwamba (Admin)
    └── Full System Access
```

### Level 2: Suppliers (National)
```
Fertilizer Suppliers
├── Mbeya Fertilizers Ltd (supplier1)
└── Tanzania Agricultural Inputs (supplier2)
```

### Level 3: Regional Distribution
```
Kagera Region
├── Retailers (Shops)
│   ├── Bukoba Agro Shop (retailer1)
│   └── Kagera Farm Supplies (retailer2)
│
└── Cooperatives (AMCOS)
    ├── Bukoba Coffee Farmers AMCOS (cooperative1) - 250 farmers
    ├── Karagwe Coffee Union (cooperative2) - 180 farmers
    └── Muleba Growers Society (cooperative3) - 320 farmers
```

### Level 4: Farmers (No Login)
```
Ministry of Agriculture Registered Farmers
├── Bukoba District (5 farmers)
│   └── MOA-KAG-001 to MOA-KAG-005
├── Karagwe District (5 farmers)
│   └── MOA-KAG-006 to MOA-KAG-010
└── Muleba District (5 farmers)
    └── MOA-KAG-011 to MOA-KAG-015
```

---

## 📊 Data Flow

### Fertilizer Distribution Flow
```
1. SUPPLIER
   └─→ Dispatch Batch
       └─→ Create batch record
           └─→ Assign to Retailer/AMCOS
               
2. RETAILER/AMCOS
   └─→ Receive Batch
       └─→ Update inventory
           └─→ Distribute to Farmer
               └─→ OTP Verification
                   └─→ Record transaction

3. FARMER
   └─→ Identified by Ministry ID
       └─→ Receives fertilizer
           └─→ Transaction logged
```

### Coffee Collection Flow
```
1. FARMER
   └─→ Delivers coffee to AMCOS
       └─→ Identified by Ministry ID
           
2. AMCOS
   └─→ Weighs coffee
       └─→ Records quantity
           └─→ Updates farmer record
               └─→ Generates receipt

3. SYSTEM
   └─→ Updates statistics
       └─→ Available in reports
           └─→ Admin can view
```

---

## 🎨 Visual Design

### Color Palette
```
Primary Colors:
■ Green 600: #16a34a  (Main brand color)
■ Green 700: #15803d  (Dark elements)
■ Green 800: #166534  (Darkest/Sidebar)
■ Green 50:  #f0fdf4  (Light backgrounds)

Chart Colors:
■ Green:  #16a34a (Fertilizer)
■ Orange: #ea580c (Coffee)
■ Blue:   #0284c7 (Analytics)
■ Lime:   #84cc16 (Secondary)
■ Amber:  #d97706 (Accents)
```

### Logo Design
```
┌──────────────────────────────┐
│   ┌────────┐                 │
│   │  ☕️   │  CoffeeChain    │
│   │ Coffee │  Trust & Security│
│   └────────┘                 │
└──────────────────────────────┘
```

---

## 📱 Dashboard Features

### Admin Dashboard
- **Metrics Cards:** 4 key metrics with icons
- **Charts:** Line chart (trends), Pie chart (distribution)
- **Tables:** Regional overview
- **Activity Feed:** Real-time updates
- **Navigation:** 4 main tabs

### Supplier Dashboard
- **Metrics Cards:** 3 key metrics
- **Quick Actions:** 2 action cards
- **Navigation:** 4 tabs
- **Features:** Dispatch, Inventory, History

### Retailer Dashboard
- **Metrics Cards:** 3 key metrics
- **Quick Actions:** 2 action cards
- **Navigation:** 5 tabs
- **Features:** Receive, Distribute, Farmers, History

### Cooperative Dashboard
- **Metrics Cards:** 4 key metrics
- **Quick Actions:** 3 action cards
- **Navigation:** 6 tabs
- **Features:** Farmers, Fertilizer In/Out, Coffee, History

---

## 🔐 Security Features

### Authentication
```
✓ Role-based access control
✓ Secure login system
✓ Session management
✓ Auto-logout capability
```

### Verification
```
✓ OTP for farmer verification
✓ Ministry ID validation
✓ Transaction timestamps
✓ Digital record keeping
```

### Data Protection
```
✓ Secure user data storage
✓ Password protection (hashed in production)
✓ Permission-based access
✓ Audit trail for all transactions
```

---

## 🌐 Multilingual Support

### Languages
- **English** - Full system support
- **Swahili** - Full system support

### Translation Coverage
```
✓ Landing page (Swahili primary)
✓ Login interface
✓ Dashboard labels
✓ Error messages
✓ Button text
✓ Navigation menus
```

---

## 📈 System Statistics

### Users
- **Admin Users:** 1
- **Suppliers:** 2
- **Retailers:** 2
- **Cooperatives:** 3
- **Total Active Users:** 8
- **Registered Farmers:** 15 (seeded)

### Coverage
- **Regions:** 1 (Kagera)
- **Districts:** 3 (Bukoba, Karagwe, Muleba)
- **Villages:** 3 (Maruku, Kayanga, Nsherekela)
- **Total Farmer Members:** 750 (across cooperatives)

### Data Points
- **Fertilizer Batches:** Tracked
- **Coffee Collections:** Tracked
- **Transactions:** All logged
- **Reports:** Generated

---

## 🛠️ Technology Stack

### Frontend
- **React:** 18.3.1
- **React Router:** 7.15.0
- **Tailwind CSS:** 4.1.12
- **Recharts:** 2.15.2
- **Lucide React:** Icons

### UI Components
- **Radix UI:** Accessible components
- **Custom Components:** Role-specific dashboards
- **Responsive Design:** Mobile-friendly

### Build Tools
- **Vite:** 6.3.5
- **pnpm:** Package manager

---

## 📂 Project Structure

```
coffeechain/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── logo.jsx                    ✓ Logo component
│   │   │   ├── landing-page.jsx            ✓ Public page
│   │   │   ├── login.jsx                   ✓ Auth system
│   │   │   ├── main-app.jsx                ✓ App wrapper
│   │   │   ├── admin-dashboard.jsx         ✓ Admin UI
│   │   │   ├── supplier-dashboard.jsx      ✓ Supplier UI
│   │   │   ├── retailer-dashboard.jsx      ✓ Retailer UI
│   │   │   ├── cooperative-dashboard.jsx   ✓ AMCOS UI
│   │   │   └── [22 other components]
│   │   ├── data/
│   │   │   ├── users.js                    ✓ User accounts
│   │   │   └── farmers.js                  ✓ Farmer data
│   │   ├── App.jsx                         ✓ Main app
│   │   └── routes.jsx                      ✓ Routing
│   └── styles/
│       ├── theme.css                       ✓ Green theme
│       └── [other styles]
├── README.md                               ✓ Full documentation
├── QUICK_ACCESS.md                         ✓ Quick reference
├── IMPLEMENTATION_SUMMARY.md               ✓ Implementation details
└── SYSTEM_OVERVIEW.md                      ✓ This file
```

---

## ✅ Implementation Checklist

### Core Features
- [x] Public landing page
- [x] CoffeeChain logo
- [x] Role-based authentication
- [x] Admin dashboard with metrics
- [x] Supplier dashboard
- [x] Retailer dashboard
- [x] Cooperative dashboard
- [x] Seeded farmer data
- [x] Green color theme
- [x] Bilingual support
- [x] Coffee/supply images
- [x] Comprehensive documentation

### User Management
- [x] Admin account (1)
- [x] Supplier accounts (2)
- [x] Retailer accounts (2)
- [x] Cooperative accounts (3)
- [x] Farmer data (15 seeded)

### UI/UX
- [x] Professional design
- [x] Responsive layout
- [x] Interactive charts
- [x] Metric cards
- [x] Navigation menus
- [x] Quick actions
- [x] Status indicators

### Documentation
- [x] README with credentials
- [x] Quick access guide
- [x] Implementation summary
- [x] System overview

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

---

## 📞 Support

**Tanzania Coffee Board**
- Website: http://localhost:5173/
- Email: info@coffeechain.go.tz
- Phone: +255 28 222 1234
- Office: Bukoba, Kagera Region

---

**System Status:** ✅ Fully Operational
**Version:** 1.0.0
**Last Updated:** May 6, 2026
**Built for:** Tanzania Coffee Board - Kagera Region
