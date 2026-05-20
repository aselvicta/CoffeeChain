# CoffeeChain - Trust & Security Platform

![CoffeeChain Logo](https://img.shields.io/badge/CoffeeChain-Trust%20%26%20Security-green?style=for-the-badge)

## Overview

CoffeeChain is a comprehensive digital platform for managing fertilizer distribution and coffee collection in Tanzania's Kagera region. The system provides transparent and secure tracking of agricultural inputs and outputs through a trust-based verification system.

## System Architecture

### User Roles

The system operates on a hierarchical structure with four distinct user roles:

1. **Admin** - System administrators with full access
2. **Suppliers** - Fertilizer suppliers who dispatch batches
3. **Retailers** - Registered shops that distribute fertilizer
4. **Cooperatives (AMCOS)** - Primary cooperatives that manage farmers

### Farmer Data

Farmers do not have login accounts. They are identified by their Ministry of Agriculture IDs and their data is seeded in the system for tracking fertilizer purchases and coffee collection.

## Demo Credentials

All demo accounts use the same password: **demo123**

### Admin Account

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `demo123` |
| Role | System Administrator |
| Organization | Tanzania Coffee Board (TCB) |
| Name | Dr. Joseph Mwamba |
| Email | admin@coffeechain.go.tz |
| Phone | +255 28 222 1234 |

**Features:**
- Full system overview dashboard with metrics
- Manage suppliers, retailers, and cooperatives
- View system-wide analytics and reports
- Monitor all transactions across the platform

---

### Supplier Accounts

#### Supplier 1
| Field | Value |
|-------|-------|
| Username | `supplier1` |
| Password | `demo123` |
| Organization | Mbeya Fertilizers Ltd |
| Supplier ID | SUP-001 |
| Email | contact@mbeyafert.co.tz |
| Phone | +255 25 250 3456 |

#### Supplier 2
| Field | Value |
|-------|-------|
| Username | `supplier2` |
| Password | `demo123` |
| Organization | Tanzania Agricultural Inputs |
| Supplier ID | SUP-002 |
| Email | info@tainputs.co.tz |
| Phone | +255 22 211 5678 |

**Features:**
- Dispatch fertilizer batches to retailers and cooperatives
- View inventory and stock levels
- Track delivery status
- View dispatch history and reports

---

### Retailer/Shop Accounts

#### Retailer 1
| Field | Value |
|-------|-------|
| Username | `retailer1` |
| Password | `demo123` |
| Organization | Bukoba Agro Shop |
| Retailer ID | RET-001 |
| Location | Jamhuri Street, Bukoba |
| Region | Kagera |
| District | Bukoba Urban |
| Email | bukobaagro@gmail.com |
| Phone | +255 784 123 456 |

#### Retailer 2
| Field | Value |
|-------|-------|
| Username | `retailer2` |
| Password | `demo123` |
| Organization | Kagera Farm Supplies |
| Retailer ID | RET-002 |
| Location | Market Area, Bukoba |
| Region | Kagera |
| District | Bukoba Rural |
| Email | kagerafarms@yahoo.com |
| Phone | +255 785 234 567 |

**Features:**
- Receive fertilizer batches from suppliers
- Distribute fertilizer to farmers with OTP verification
- View registered farmers
- Track stock and transactions

---

### Cooperative (AMCOS) Accounts

#### Cooperative 1
| Field | Value |
|-------|-------|
| Username | `cooperative1` |
| Password | `demo123` |
| Organization | Bukoba Coffee Farmers AMCOS |
| AMCOS ID | AMCOS-001 |
| Village | Maruku |
| District | Bukoba Rural |
| Region | Kagera |
| Members | 250 farmers |
| Email | bukobacoopamcos@gmail.com |
| Phone | +255 786 345 678 |

#### Cooperative 2
| Field | Value |
|-------|-------|
| Username | `cooperative2` |
| Password | `demo123` |
| Organization | Karagwe Coffee Union |
| AMCOS ID | AMCOS-002 |
| Village | Kayanga |
| District | Karagwe |
| Region | Kagera |
| Members | 180 farmers |
| Email | karagweunion@gmail.com |
| Phone | +255 787 456 789 |

#### Cooperative 3
| Field | Value |
|-------|-------|
| Username | `cooperative3` |
| Password | `demo123` |
| Organization | Muleba Growers Society |
| AMCOS ID | AMCOS-003 |
| Village | Nsherekela |
| District | Muleba |
| Region | Kagera |
| Members | 320 farmers |
| Email | mulebagrow@yahoo.com |
| Phone | +255 788 567 890 |

**Features:**
- Manage farmer registry (member farmers)
- Receive fertilizer from suppliers and retailers
- Distribute fertilizer to farmers with OTP verification
- Collect coffee from farmers
- Track all farmer transactions

---

## Seeded Farmer Data

Farmers are identified by Ministry of Agriculture IDs. Sample farmers include:

- **MOA-KAG-001** - Juma Abdallah (Maruku, AMCOS-001)
- **MOA-KAG-002** - Asha Mwita (Maruku, AMCOS-001)
- **MOA-KAG-003** - Hamisi Kassim (Maruku, AMCOS-001)
- **MOA-KAG-006** - Emmanuel Rweyemamu (Kayanga, AMCOS-002)
- **MOA-KAG-007** - Grace Nyamwiza (Kayanga, AMCOS-002)
- **MOA-KAG-011** - Frank Birungi (Nsherekela, AMCOS-003)

_Total: 15 seeded farmers across 3 cooperatives_

---

## Key Features

### 1. Public Landing Page
- Accessible without login at the home route (`/`)
- Bilingual content (Swahili/English)
- Information about the platform
- Contact details and about section

### 2. Role-Based Authentication
- Secure login system with role-based access
- Automatic routing to appropriate dashboard based on user role
- Session management

### 3. Admin Dashboard
- Comprehensive metrics and analytics
- Real-time monitoring of suppliers, retailers, and cooperatives
- Regional overview for Kagera
- Monthly trends visualization
- Recent activity tracking

### 4. Supplier Dashboard
- Batch dispatch management
- Inventory tracking
- Delivery status monitoring
- Dispatch history

### 5. Retailer Dashboard
- Receive batches from suppliers
- Distribute fertilizer to farmers
- Farmer registry
- Stock management

### 6. Cooperative Dashboard
- Farmer registry management
- Fertilizer distribution with OTP verification
- Coffee collection tracking
- Transaction history

### 7. OTP Verification System
- 4-digit OTP input for farmer verification
- Bilingual support (English/Kiswahili)
- Secure farmer identification

### 8. Offline Functionality
- Designed to work in rural areas with limited connectivity
- Local data caching (to be implemented)

---

## Color Scheme

The platform uses a **green color scheme** throughout:

- Primary Green: `#16a34a` (green-600)
- Dark Green: `#15803d` (green-700)
- Very Dark Green: `#166534` (green-800)
- Light Green: `#86efac` (green-300)
- Green Backgrounds: Various shades from green-50 to green-900

Primary buttons are designed with sufficient contrast for visibility.

---

## Technology Stack

- **Frontend Framework:** React 18
- **Routing:** React Router
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React
- **UI Components:** Custom components with Radix UI primitives

---

## Getting Started

1. **Access the Platform:**
   - Navigate to the home page to see the public landing page
   - Click "Ingia Mfumo" to access the login page

2. **Login:**
   - Select your role (Admin, Supplier, Retailer, or Cooperative)
   - Enter credentials from the table above
   - All passwords are: `demo123`

3. **Explore:**
   - Each role has a different dashboard and feature set
   - Navigate using the sidebar menu
   - Logout using the logout button in the header

---

## System Workflow

### Fertilizer Distribution Flow
1. **Supplier** → Dispatches batches to Retailers/AMCOS
2. **Retailer/AMCOS** → Receives batches and distributes to farmers
3. **Farmer** → Verified using Ministry of Agriculture ID and OTP
4. **System** → Records transaction with timestamp and verification

### Coffee Collection Flow
1. **Farmer** → Delivers coffee to AMCOS
2. **AMCOS** → Records collection with farmer ID and quantity
3. **System** → Updates records and generates reports

---

## Contact Information

**Tanzania Coffee Board**
- Email: info@coffeechain.go.tz
- Phone: +255 28 222 1234
- Location: Ofisi ya Mkoa, Bukoba, Kagera

**Regional Office (Kagera)**
- Location: Bukoba, Kagera Region
- Districts Covered: Bukoba Urban, Bukoba Rural, Karagwe, Muleba

---

## Future Enhancements

- Integration with Ministry of Agriculture API for real-time farmer data
- Mobile application for field agents
- SMS notifications for farmers
- Advanced analytics and predictive insights
- Export functionality for reports
- Multi-language support expansion

---

## Support

For technical support or questions about the platform, please contact:
- **Email:** support@coffeechain.go.tz
- **Phone:** +255 28 222 1234

---

## License

© 2026 Tanzania Coffee Board. All rights reserved.

This system is developed for the exclusive use of Tanzania Coffee Board and its authorized partners in the Kagera region coffee value chain.

---

**Built with ❤️ for Tanzania's Coffee Farmers**
