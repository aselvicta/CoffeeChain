import { LayoutDashboard, Package, Leaf, Shield, FileText, Coffee, ArrowLeftRight, Truck, CheckSquare, Users, BookOpen } from 'lucide-react';
import { useLanguage } from './language-context';

export function Sidebar({ activeTab, setActiveTab, userRole, userProfile }) {
  const { t, language } = useLanguage();
  
  // Role-specific menu items based on Kagera requirements
  const getMenuItems = () => {
    if (userRole === 'national') {
      // Check if user is admin (super user)
      const isAdmin = userProfile?.isAdmin || userProfile?.username === 'national_admin';
      
      if (isAdmin) {
        return [
          { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
          { id: 'system-governance', labelKey: 'systemGovernance', icon: Shield },
          { id: 'master-ledger', labelKey: 'masterLedger', icon: BookOpen },
          { id: 'audit-trail', labelKey: 'auditTrail', icon: FileText },
          { id: 'reports', labelKey: 'globalReports', icon: FileText },
        ];
      } else {
        // Standard National User
        return [
          { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
          { id: 'batch-dispatch', labelKey: 'batchDispatch', icon: Truck },
          { id: 'regional-monitoring', labelKey: 'regionalMonitoring', icon: CheckSquare },
          { id: 'stock-inventory', labelKey: 'stockInventory', icon: Package },
        ];
      }
    } else if (userRole === 'regional') {
      // Kagera Regional Office
      return [
        { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
        { id: 'incoming-batches', labelKey: 'incomingBatches', icon: Truck },
        { id: 'amcos-allocation', labelKey: 'amcosAllocation', icon: Package },
        { id: 'validation-center', labelKey: 'validationCenter', icon: CheckSquare },
        { id: 'reports', labelKey: 'kageraReports', icon: FileText },
      ];
    } else {
      // AMCOS Cooperative Level
      return [
        { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
        { id: 'farmer-registry', labelKey: 'farmerRegistry', icon: Users },
        { id: 'fertilizer-out', labelKey: 'fertilizerOut', icon: Package },
        { id: 'coffee-in', labelKey: 'coffeeIn', icon: Leaf },
        { id: 'history', labelKey: 'history', icon: BookOpen },
      ];
    }
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    switch (userRole) {
      case 'national':
        return { text: t('nationalLevel'), color: 'bg-purple-600' };
      case 'regional':
        return { text: t('regionalLevel'), color: 'bg-blue-600' };
      case 'cooperative':
        return { text: t('cooperativeLevel'), color: 'bg-green-600' };
      default:
        return { text: 'Unknown', color: 'bg-gray-600' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="w-64 bg-green-800 text-white flex flex-col">
      <div className="p-6 border-b border-green-700">
        <div className="flex items-center gap-3">
          <Coffee className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">
              {language === 'en' ? 'CoffeeChain' : 'CoffeeChain'}
            </h1>
            <p className="text-xs text-green-200">
              {language === 'en' ? 'Trust & Security Platform' : 'Uhakiki na Usalama'}
            </p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-green-700 text-white'
                      : 'text-green-100 hover:bg-green-700/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{t(item.labelKey)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-green-700 space-y-3">
        <div className={`${roleBadge.color} px-3 py-2 rounded-lg text-center`}>
          <p className="text-xs font-medium text-white">{roleBadge.text}</p>
        </div>
        <div className="text-xs text-green-200">
          <p className="font-medium">{userProfile?.organization || 'Organization'}</p>
          {userProfile?.region && <p className="mt-1">{userProfile.region}</p>}
          {userProfile?.district && <p className="mt-1">{userProfile.district}</p>}
        </div>
      </div>
    </div>
  );
}