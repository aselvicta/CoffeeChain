import { useState, useEffect } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { useLanguage } from './language-context';

export function OfflineIndicator() {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // synced, syncing, offline
  
  // Simulate sync status changes
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.9) {
        setSyncStatus('syncing');
        setTimeout(() => setSyncStatus('synced'), 2000);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const getStatusColor = () => {
    if (!isOnline || syncStatus === 'offline') return 'text-red-500';
    if (syncStatus === 'syncing') return 'text-yellow-500';
    return 'text-green-500';
  };
  
  const getStatusText = () => {
    if (!isOnline || syncStatus === 'offline') return t('offline');
    if (syncStatus === 'syncing') return t('syncing');
    return t('synced');
  };
  
  return (
    <div className="flex items-center gap-2">
      {isOnline && syncStatus !== 'offline' ? (
        <Cloud className={`w-5 h-5 ${getStatusColor()}`} />
      ) : (
        <CloudOff className="w-5 h-5 text-red-500" />
      )}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
}
