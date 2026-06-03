import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Login } from './login';
import { AdminDashboard } from './admin-dashboard';
import { SupplierDashboard } from './supplier-dashboard';
import { RetailerDashboard } from './retailer-dashboard';
import { CooperativeDashboard } from './cooperative-dashboard';
import { LanguageProvider } from './language-context';
import { fetchProfile, getAccessToken, login, logout } from '../api/client';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';

const DASHBOARD_CONFIG = {
  admin: {
    defaultTab: 'overview',
    validTabs: ['overview', 'suppliers', 'retailers', 'cooperatives', 'users'],
  },
  supplier: {
    defaultTab: 'overview',
    validTabs: ['overview', 'dispatch', 'dispatched', 'warehouse', 'inventory', 'analytics', 'history'],
  },
  retailer: {
    defaultTab: 'overview',
    validTabs: ['overview', 'receive', 'distribute', 'customers', 'verification', 'history', 'analytics'],
  },
  cooperative: {
    defaultTab: 'overview',
    validTabs: ['overview', 'farmers', 'fertilizer-in', 'fertilizer-out', 'verification', 'history', 'analytics'],
  },
};

function normalizeRole(role) {
  return role === 'national' ? 'admin' : role;
}

export function MainApp() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const buildProfile = (profile) => {
    const { user, role, supplier, branch } = profile;
    const displayName = user.first_name || user.username;
    if (role === 'supplier' && supplier) {
      return {
        role,
        username: user.username,
        name: supplier.name,
        organization: supplier.name,
        supplierId: `SUP-${supplier.id.toString().padStart(3, '0')}`,
        supplierRecordId: supplier.id,
      };
    }
    if (role === 'retailer' && branch) {
      return {
        role,
        username: user.username,
        name: branch.name,
        organization: branch.name,
        location: `${branch.district || ''} ${branch.region || ''}`.trim(),
        retailerId: `RET-${branch.id.toString().padStart(3, '0')}`,
        branchId: branch.id,
      };
    }
    if (role === 'cooperative' && branch) {
      return {
        role,
        username: user.username,
        name: branch.name,
        organization: branch.name,
        village: branch.district || branch.region || '',
        cooperativeId: `AMCOS-${branch.id.toString().padStart(3, '0')}`,
        branchId: branch.id,
        memberCount: branch.farmers?.length,
      };
    }
    if (role === 'regulator') {
      return {
        role: 'admin',
        username: user.username,
        name: displayName,
        level: 'Regulatory Authority',
        organization: 'Tanzania Coffee Board (TCB)',
      };
    }
    return {
      role: 'admin',
      username: user.username,
      name: displayName,
      level: 'National Administrator',
      organization: 'Tanzania Coffee Board (TCB)',
    };
  };

  useEffect(() => {
    const boot = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await fetchProfile();
        setUserProfile(buildProfile(profile));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    const onSessionExpired = () => {
      setUserProfile(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('coffeechain:session-expired', onSessionExpired);
    return () => window.removeEventListener('coffeechain:session-expired', onSessionExpired);
  }, [navigate]);

  const handleLogin = async ({ username, password }) => {
    await login(username, password);
    const profile = await fetchProfile();
    const mapped = buildProfile(profile);
    setUserProfile(mapped);
  };

  const handleLogout = () => {
    logout();
    setUserProfile(null);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (isLoading || !userProfile) {
      return;
    }

    const role = normalizeRole(userProfile.role);
    const config = DASHBOARD_CONFIG[role] || DASHBOARD_CONFIG.admin;
    const currentTab = resolveDashboardTab(location.pathname, role, {
      defaultTab: config.defaultTab,
      validTabs: config.validTabs,
    });
    const nextPath = buildDashboardPath(role, currentTab);

    if (location.pathname !== nextPath) {
      navigate(nextPath, { replace: true });
    }
  }, [isLoading, location.pathname, navigate, userProfile]);

  useEffect(() => {
    if (isLoading || userProfile) {
      return;
    }

    if (location.pathname.startsWith('/app')) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, location.pathname, navigate, userProfile]);

  // If not logged in, show login screen
  if (isLoading) {
    return (
      <LanguageProvider>
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Loading CoffeeChain...
        </div>
      </LanguageProvider>
    );
  }

  if (!userProfile) {
    return (
      <LanguageProvider>
        <Login onLogin={handleLogin} />
      </LanguageProvider>
    );
  }

  // Route to appropriate dashboard based on role
  const renderDashboard = () => {
    switch (userProfile.role) {
      case 'admin':
      case 'national':
        return <AdminDashboard userProfile={userProfile} onLogout={handleLogout} />;
      case 'supplier':
        return <SupplierDashboard userProfile={userProfile} onLogout={handleLogout} />;
      case 'retailer':
        return <RetailerDashboard userProfile={userProfile} onLogout={handleLogout} />;
      case 'cooperative':
        return <CooperativeDashboard userProfile={userProfile} onLogout={handleLogout} />;
      default:
        return <AdminDashboard userProfile={userProfile} onLogout={handleLogout} />;
    }
  };

  return (
    <LanguageProvider>
      {renderDashboard()}
    </LanguageProvider>
  );
}
