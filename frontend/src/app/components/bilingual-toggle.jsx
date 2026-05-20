import { useLanguage } from './language-context';
import { Languages } from 'lucide-react';

export function BilingualToggle() {
  const { language, toggleLanguage } = useLanguage();
  
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      title="Switch Language / Badili Lugha"
    >
      <Languages className="w-4 h-4 text-gray-600" />
      <div className="flex items-center gap-1">
        <span className={`text-sm font-medium ${language === 'en' ? 'text-blue-600' : 'text-gray-400'}`}>
          EN
        </span>
        <span className="text-gray-300">|</span>
        <span className={`text-sm font-medium ${language === 'sw' ? 'text-blue-600' : 'text-gray-400'}`}>
          SW
        </span>
      </div>
    </button>
  );
}
