import { useState } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './language-context';

interface TrustSealProps {
  recordId: string;
  timestamp: string;
  verifiedBy?: string;
}

export function TrustSeal({ recordId, timestamp, verifiedBy = 'Kagera Office & TCB' }: TrustSealProps) {
  const { t, language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  
  // Generate a simplified verification ID (not a blockchain hash)
  const verificationId = recordId ? `VRF-${recordId.slice(-8)}` : 'VRF-XXXXXXXX';
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-mono text-gray-600">
            {verificationId}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          <span className="text-xs text-green-600 font-medium">
            {t('recordSecured')}
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showDetails ? t('close') : t('view')}
        </button>
      </div>
      
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {language === 'en' ? 'Record ID' : 'Nambari ya Kumbukumbu'}:
            </span>
            <span className="font-mono text-gray-700">{recordId}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {language === 'en' ? 'Timestamp' : 'Muda'}:
            </span>
            <span className="text-gray-700">{timestamp}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {language === 'en' ? 'Verified By' : 'Imethibitishwa na'}:
            </span>
            <span className="text-gray-700">{verifiedBy}</span>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-gray-600">
              {language === 'en' ? 'Secured in trust ledger' : 'Imelindwa katika daftari la uaminifu'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
