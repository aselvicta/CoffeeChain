import { Package, Leaf, AlertTriangle } from 'lucide-react';
import { useLanguage } from './language-context';

export function ProductionBalance({ fertilizerBags = 500, coffeeKg = 22500 }) {
  const { t } = useLanguage();
  
  // Reconciliation rule: 1 bag of fertilizer should result in ~50kg of coffee
  const expectedCoffee = fertilizerBags * 50;
  const actualCoffee = coffeeKg;
  const percentage = (actualCoffee / expectedCoffee) * 100;
  
  // Warning if actual is less than 70% of expected
  const isWarning = percentage < 70;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('language') === 'en' ? 'Production Balance' : 'Usawa wa Uzalishaji'}
        </h3>
        {isWarning && (
          <div className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">{t('discrepancyWarning')}</span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{t('fertilizerDistributed')}</span>
          <span className="text-sm text-gray-600">{t('coffeeHarvested')}</span>
        </div>
        
        <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
          {/* Purple bar (Fertilizer) - always full width */}
          <div className="absolute inset-0 bg-purple-200 flex items-center px-3">
            <Package className="w-4 h-4 text-purple-700 mr-2" />
            <span className="text-sm font-semibold text-purple-700">
              {fertilizerBags.toLocaleString()} {t('language') === 'en' ? 'bags' : 'mifuko'}
            </span>
          </div>
          
          {/* Green bar (Coffee) - proportional width */}
          <div 
            className={`absolute inset-y-0 left-0 ${isWarning ? 'bg-yellow-400' : 'bg-green-400'} flex items-center justify-end px-3 transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <Leaf className={`w-4 h-4 ${isWarning ? 'text-yellow-800' : 'text-green-800'} mr-2`} />
            <span className={`text-sm font-semibold ${isWarning ? 'text-yellow-800' : 'text-green-800'}`}>
              {coffeeKg.toLocaleString()} kg
            </span>
          </div>
        </div>
        
        {/* Status line with arrow or broken line */}
        <div className="flex items-center justify-center mt-2">
          {isWarning ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <div className="w-8 h-0.5 bg-yellow-400"></div>
              <span className="text-xs text-yellow-600 font-medium mx-2">
                {t('language') === 'en' ? 'Awaiting Validation' : 'Inasubiri Uthibitisho'}
              </span>
              <div className="w-8 h-0.5 bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
              <div className="w-8 h-0.5 bg-yellow-400"></div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-24 h-0.5 bg-green-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-green-600 font-medium mx-2">
                {t('language') === 'en' ? 'Consensus Reached' : 'Makubaliano Yamefikiwa'}
              </span>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="w-24 h-0.5 bg-green-500"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">
            {t('language') === 'en' ? 'Input' : 'Pembejeo'}
          </p>
          <p className="text-lg font-bold text-purple-600">
            {fertilizerBags.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {t('language') === 'en' ? 'bags' : 'mifuko'}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">
            {t('expectedYield')}
          </p>
          <p className="text-lg font-bold text-gray-600">
            {expectedCoffee.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">kg</p>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">
            {t('actualYield')}
          </p>
          <p className={`text-lg font-bold ${isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
            {actualCoffee.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">kg</p>
        </div>
      </div>
      
      {/* Reconciliation note */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">{t('reconciliationRule')}:</span>{' '}
          {t('language') === 'en' 
            ? '1 bag of fertilizer should yield ~50kg of coffee'
            : 'Mfuko 1 wa mbolea unapaswa kuzalisha ~50kg ya kahawa'
          }
        </p>
      </div>
    </div>
  );
}
