# CoffeeChain Testing Guide

## 🧪 How to Test All Features

### 1. Public Landing Page Test

**URL:** `http://localhost:5173/`

✅ **What to verify:**
- [ ] Page loads without errors
- [ ] CoffeeChain logo appears in navigation (white text on green background)
- [ ] "Ingia Mfumo" button is visible
- [ ] Coffee plantation image shows in hero section
- [ ] All Swahili text is correct
- [ ] Features section (3 cards) displays
- [ ] About section with coffee harvest image
- [ ] How it works (3 steps with arrows)
- [ ] Contact section (3 contact methods)
- [ ] Footer with logo and links
- [ ] All links work (test "Ingia Mfumo" button)

---

### 2. Login System Test

**URL:** `http://localhost:5173/login`

✅ **What to verify:**
- [ ] Login page displays with coffee/supply images in background
- [ ] CoffeeChain logo shows in header
- [ ] Coffee beans pattern visible in header
- [ ] 4 role buttons appear:
  - System Administrator
  - Fertilizer Supplier
  - Retail Shop
  - AMCOS Cooperative
- [ ] Can select a role
- [ ] Username and password fields appear
- [ ] "Change role" button works
- [ ] Bilingual toggle works (if visible)

**Test Invalid Login:**
```
Username: wrong
Password: wrong
Expected: Error message appears
```

**Test Valid Login:**
```
Username: admin
Password: demo123
Expected: Redirect to admin dashboard
```

---

### 3. Admin Dashboard Test

**Login:** `admin` / `demo123`

✅ **What to verify:**
- [ ] Beautiful dashboard loads
- [ ] Sidebar with green gradient background
- [ ] CoffeeChain logo in sidebar
- [ ] 4 metric cards display:
  - Total Suppliers: 12
  - Active Retailers: 47
  - Cooperatives: 28
  - Coffee Collected: 1,520
- [ ] Charts render without errors:
  - Monthly Trends (line chart)
  - Fertilizer Distribution (pie chart)
- [ ] Regional Overview table shows 3 regions
- [ ] Recent Activity feed displays
- [ ] Navigation tabs work:
  - Overview
  - Suppliers
  - Retailers
  - Cooperatives
- [ ] User profile shows in header (Dr. Joseph Mwamba)
- [ ] Logout button works
- [ ] No console errors
- [ ] No duplicate key warnings

---

### 4. Supplier Dashboard Test

**Login:** `supplier1` / `demo123`

✅ **What to verify:**
- [ ] Supplier dashboard loads
- [ ] Organization name: "Mbeya Fertilizers Ltd"
- [ ] Supplier ID: SUP-001
- [ ] 3 metric cards display
- [ ] Sidebar navigation works
- [ ] Tabs change content:
  - Overview
  - Dispatch Batches
  - Inventory
  - History
- [ ] Quick action cards appear
- [ ] Logout works

**Repeat for:** `supplier2` / `demo123`

---

### 5. Retailer Dashboard Test

**Login:** `retailer1` / `demo123`

✅ **What to verify:**
- [ ] Retailer dashboard loads
- [ ] Organization: "Bukoba Agro Shop"
- [ ] Location: "Jamhuri Street, Bukoba"
- [ ] Retailer ID: RET-001
- [ ] 3 metric cards display
- [ ] 5 navigation tabs work:
  - Overview
  - Receive Batches
  - Distribute Fertilizer
  - Farmers
  - History
- [ ] Quick actions appear
- [ ] Logout works

**Repeat for:** `retailer2` / `demo123`

---

### 6. Cooperative Dashboard Test

**Login:** `cooperative1` / `demo123`

✅ **What to verify:**
- [ ] Cooperative dashboard loads
- [ ] Organization: "Bukoba Coffee Farmers AMCOS"
- [ ] AMCOS ID: AMCOS-001
- [ ] Member count: 250
- [ ] 4 metric cards display
- [ ] 6 navigation tabs work:
  - Overview
  - Farmer Registry
  - Receive Fertilizer
  - Distribute Fertilizer
  - Collect Coffee
  - History
- [ ] Quick actions (3 cards) appear
- [ ] Logout works

**Repeat for:**
- `cooperative2` / `demo123` (180 members)
- `cooperative3` / `demo123` (320 members)

---

### 7. Role-Based Authentication Test

**Test that each role sees their specific dashboard:**

| Username | Role | Expected Dashboard |
|----------|------|-------------------|
| admin | Admin | Admin Dashboard with metrics |
| supplier1 | Supplier | Supplier Dashboard |
| supplier2 | Supplier | Supplier Dashboard |
| retailer1 | Retailer | Retailer Dashboard |
| retailer2 | Retailer | Retailer Dashboard |
| cooperative1 | AMCOS | Cooperative Dashboard |
| cooperative2 | AMCOS | Cooperative Dashboard |
| cooperative3 | AMCOS | Cooperative Dashboard |

---

### 8. Color Scheme Test

✅ **Verify green theme throughout:**
- [ ] Primary buttons are green (#16a34a)
- [ ] Sidebars have green gradient
- [ ] Logo has green colors
- [ ] Primary actions are visible
- [ ] Charts use green as primary color
- [ ] Hover states work
- [ ] No black color scheme (replaced with green)

---

### 9. Logo Test

✅ **Verify logo appears correctly:**
- [ ] Landing page navigation (white text)
- [ ] Landing page footer (white text)
- [ ] Login page header (white background)
- [ ] Admin sidebar
- [ ] Supplier sidebar
- [ ] Retailer sidebar
- [ ] Cooperative sidebar

---

### 10. Responsive Design Test

✅ **Test on different screen sizes:**
- [ ] Desktop (1920px) - Full layout
- [ ] Laptop (1366px) - Compact layout
- [ ] Tablet (768px) - Stacked layout
- [ ] Mobile (375px) - Single column

**Verify:**
- [ ] Sidebars collapse on mobile
- [ ] Charts resize properly
- [ ] Tables are scrollable
- [ ] Buttons remain clickable
- [ ] Text is readable

---

### 11. Data Verification Test

**Check that all seeded data is accessible:**

✅ **Users (8 total):**
- [ ] 1 Admin account works
- [ ] 2 Supplier accounts work
- [ ] 2 Retailer accounts work
- [ ] 3 Cooperative accounts work

✅ **Farmers (15 total):**
- [ ] Farmer data exists in `/src/app/data/farmers.js`
- [ ] IDs: MOA-KAG-001 to MOA-KAG-015
- [ ] 3 cooperatives have farmers assigned

---

### 12. Navigation Test

**Test routing:**
- [ ] `/` → Landing page
- [ ] `/login` → Login page
- [ ] `/app` → Login page (then dashboard after login)
- [ ] Any other URL → Landing page (404 fallback)

**Test login flow:**
1. Start at `/`
2. Click "Ingia Mfumo"
3. Should go to `/login`
4. Select role and login
5. Should redirect to dashboard
6. Click logout
7. Should return to login

---

### 13. Documentation Test

✅ **Verify documentation files exist:**
- [ ] `/README.md` - Complete with credentials
- [ ] `/QUICK_ACCESS.md` - Quick reference guide
- [ ] `/IMPLEMENTATION_SUMMARY.md` - Feature summary
- [ ] `/SYSTEM_OVERVIEW.md` - Architecture overview
- [ ] `/TESTING_GUIDE.md` - This file

**Check README:**
- [ ] All 8 user credentials listed
- [ ] Password (demo123) clearly stated
- [ ] Role descriptions accurate
- [ ] Contact information present
- [ ] Feature list complete

---

### 14. Browser Compatibility Test

✅ **Test in different browsers:**
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Check for:**
- [ ] No console errors
- [ ] Charts render correctly
- [ ] Images load
- [ ] Fonts display properly
- [ ] Animations work

---

### 15. Performance Test

✅ **Check application performance:**
- [ ] Landing page loads in < 2 seconds
- [ ] Login page loads quickly
- [ ] Dashboard transition is smooth
- [ ] Charts render without lag
- [ ] No memory leaks (check dev tools)
- [ ] Images are optimized

---

## 🐛 Common Issues & Solutions

### Issue: Login doesn't work
**Solution:** Ensure you're using exact username and password `demo123`

### Issue: Dashboard not showing
**Solution:** Check browser console for errors, verify role is set correctly

### Issue: Images not loading
**Solution:** Check internet connection, Unsplash URLs should work

### Issue: Charts not rendering
**Solution:** Verify recharts is installed, check for duplicate keys

### Issue: Colors look wrong
**Solution:** Clear browser cache, check theme.css was updated

### Issue: Logo not showing
**Solution:** Verify logo.jsx component exists and is imported correctly

### Issue: Routing not working
**Solution:** Check that react-router is installed and routes.jsx is configured

---

## ✅ Final Checklist

Before considering testing complete:

### Functionality
- [ ] All 8 user accounts can login
- [ ] Each role sees their specific dashboard
- [ ] Logout works from all dashboards
- [ ] Landing page is accessible
- [ ] All navigation works

### Design
- [ ] Green color scheme throughout
- [ ] Logo appears everywhere
- [ ] Coffee images on login
- [ ] Charts display correctly
- [ ] Responsive on mobile

### Data
- [ ] User data loads correctly
- [ ] Farmer data is seeded
- [ ] Metrics display properly
- [ ] No data errors

### Documentation
- [ ] README is accurate
- [ ] Credentials are correct
- [ ] All features documented

### Performance
- [ ] No console errors
- [ ] No warnings (except expected)
- [ ] Fast load times
- [ ] Smooth interactions

---

## 📊 Test Results Template

```
TESTING SESSION: [Date]
TESTER: [Name]

LANDING PAGE: ✅ / ❌
LOGIN SYSTEM: ✅ / ❌
ADMIN DASHBOARD: ✅ / ❌
SUPPLIER DASHBOARDS: ✅ / ❌
RETAILER DASHBOARDS: ✅ / ❌
COOPERATIVE DASHBOARDS: ✅ / ❌
AUTHENTICATION: ✅ / ❌
COLOR SCHEME: ✅ / ❌
LOGO DISPLAY: ✅ / ❌
RESPONSIVE DESIGN: ✅ / ❌
DOCUMENTATION: ✅ / ❌

ISSUES FOUND:
1. [Description]
2. [Description]

OVERALL STATUS: PASS / FAIL
```

---

## 🎯 Success Criteria

The system passes testing if:

1. ✅ All 8 user accounts can login successfully
2. ✅ Each dashboard loads without errors
3. ✅ Green color scheme is consistent
4. ✅ Logo displays correctly everywhere
5. ✅ Landing page works and is in Swahili
6. ✅ No console errors during normal use
7. ✅ All documentation is accurate
8. ✅ Charts and images load properly
9. ✅ Logout works from all dashboards
10. ✅ Responsive design works on mobile

---

**Happy Testing! 🚀**

For issues or questions, refer to README.md or SYSTEM_OVERVIEW.md
