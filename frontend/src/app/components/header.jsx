import { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings, HelpCircle, ChevronDown } from 'lucide-react';
import { BilingualToggle } from './bilingual-toggle';
import { OfflineIndicator } from './offline-indicator';
import { useLanguage } from './language-context';

export function Header({ userProfile, onLogout }) {
  const { t } = useLanguage();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleColor = () => {
    switch (userProfile?.role) {
      case 'national':
        return 'bg-purple-600';
      case 'regional':
        return 'bg-blue-600';
      case 'cooperative':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search') + "..."}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 ml-6">
          {/* Offline Indicator */}
          <OfflineIndicator />
          
          {/* Bilingual Toggle */}
          <BilingualToggle />
          
          {/* Notification Bell */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="relative pl-4 border-l border-gray-200" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-medium">{userProfile?.username || 'User'}</p>
                <p className="text-xs text-gray-500">{userProfile?.level || 'Level'}</p>
              </div>
              <div className={`h-10 w-10 ${getRoleColor()} rounded-full flex items-center justify-center`}>
                <User className="h-5 w-5 text-white" />
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userProfile?.username}</p>
                  <p className="text-xs text-gray-500 mt-1">{userProfile?.organization}</p>
                  {userProfile?.region && (
                    <p className="text-xs text-gray-500">{userProfile?.region}</p>
                  )}
                  {userProfile?.district && (
                    <p className="text-xs text-gray-500">{userProfile?.district}</p>
                  )}
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 text-xs font-medium text-white ${getRoleColor()} rounded`}>
                      {userProfile?.level}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User className="h-4 w-4" />
                    My Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </button>
                </div>

                <div className="border-t border-gray-200 py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}