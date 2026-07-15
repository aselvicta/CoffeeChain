# CoffeeChain - Trust & Security Platform

![CoffeeChain Logo](https://img.shields.io/badge/CoffeeChain-Trust%20%26%20Security-green?style=for-the-badge)

## Overview

CoffeeChain is a comprehensive digital platform for managing fertilizer distribution and coffee collection across Tanzania's coffee-producing regions. The system provides transparent and secure tracking of agricultural inputs and outputs through a trust-based verification system.

## System Architecture

### User Roles

The system operates on a hierarchical structure with four distinct user roles:

1. **Admin** - System administrators with full access
2. **Suppliers** - Fertilizer suppliers who dispatch batches
3. **Retailers** - Registered shops that distribute fertilizer
4. **Cooperatives (AMCOS)** - Primary cooperatives that manage farmers

### Farmer Data

Farmers do not have login accounts. They are identified by their Ministry of Agriculture IDs and their data is seeded in the system for tracking fertilizer purchases and coffee collection.

## Access & Account Setup

Demo credentials are not listed in this repository. Create admin and role accounts through your deployment or via Django admin as part of your secure onboarding process.

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
- Regional overview across coffee-producing regions
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
   - Enter the credentials issued by your administrator

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

**Project Participants and Contributions**
- Victor Asel Kabugumila - Backend Developer & Blockchain integration (TEAM LEAD)
- Maxmillian Kayombo - Frontend Developer & UI/UX 
- Sirili Ammi - Backend Developer & Co-System Architect
- Joshua Mbwilo - Database designer & System Architect
- Phone: +255 745 979 712
- Location: Dar es Salaam, Tanzania

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

This system is developed for the exclusive use of Tanzania Coffee Board and its authorized partners in Tanzania's coffee-producing regions.

---

**Built with ❤️ for Tanzania's Coffee Farmers**
