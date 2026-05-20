import { Database } from 'lucide-react';
import { useLanguage } from './language-context';
import { motion } from 'motion/react';

export function SyncPulse() {
  const { t } = useLanguage();
  
  const nodes = [
    { 
      name: t('nationalLevel'),
      nameEn: 'National',
      nameSw: 'Kitaifa',
      status: 'connected',
      color: 'purple'
    },
    { 
      name: t('regionalLevel'),
      nameEn: 'Kagera Region',
      nameSw: 'Mkoa wa Kagera',
      status: 'connected',
      color: 'blue'
    },
    { 
      name: t('cooperativeLevel'),
      nameEn: 'AMCOS',
      nameSw: 'AMCOS',
      status: 'synced',
      color: 'green'
    }
  ];
  
  const getStatusColor = (color, status) => {
    if (status === 'offline') return 'bg-red-500';
    if (color === 'purple') return 'bg-purple-500';
    if (color === 'blue') return 'bg-blue-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-semibold text-gray-700">
          {t('syncStatus')}
        </h3>
      </div>
      
      <div className="space-y-3">
        {nodes.map((node, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <motion.div
                  className={`w-2 h-2 rounded-full ${getStatusColor(node.color, node.status)}`}
                  animate={{
                    scale: node.status === 'offline' ? 1 : [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {node.name}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {t(node.status)}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {t('language') === 'en' ? 'Last Sync' : 'Msawazisho wa Mwisho'}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
