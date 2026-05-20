import { Home, MapPin, Building2 } from 'lucide-react';
import { useLanguage } from './language-context';

export function BreadcrumbTrace({ userProfile }) {
  const { t } = useLanguage();
  
  // Always show the full hierarchy: National > Regional > AMCOS
  const getBreadcrumbItems = () => {
    const items = [
      {
        icon: Home,
        label: t('nationalLevel'),
        subLabel: 'TCB',
        active: userProfile.role === 'national'
      }
    ];
    
    if (userProfile.role === 'regional' || userProfile.role === 'cooperative') {
      items.push({
        icon: MapPin,
        label: t('regionalLevel'),
        subLabel: userProfile.region || 'Kagera',
        active: userProfile.role === 'regional'
      });
    }
    
    if (userProfile.role === 'cooperative') {
      items.push({
        icon: Building2,
        label: t('cooperativeLevel'),
        subLabel: userProfile.organization || 'AMCOS',
        active: userProfile.role === 'cooperative'
      });
    }
    
    return items;
  };
  
  const items = getBreadcrumbItems();
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-gray-300 mx-1">›</span>
            )}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              item.active 
                ? 'bg-blue-50 border border-blue-200' 
                : 'bg-gray-50'
            }`}>
              <item.icon className={`w-4 h-4 ${
                item.active ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div className="flex flex-col">
                <span className={`font-medium ${
                  item.active ? 'text-blue-900' : 'text-gray-600'
                }`}>
                  {item.label}
                </span>
                <span className={`text-xs ${
                  item.active ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {item.subLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Distributed ledger indicator */}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-gray-500">
          {t('language') === 'en' 
            ? 'Distributed Ledger Network' 
            : 'Mtandao wa Daftari Lililogawanywa'
          }
        </span>
      </div>
    </div>
  );
}
