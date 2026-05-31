import { useState, useEffect } from 'react';
import { Lock, Shield, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { useLanguage } from './language-context';

interface SmsInfo {
  provider?: string;
  delivered?: boolean;
  api_accepted?: boolean;
  sandbox_mode?: boolean;
  trial_mode?: boolean;
  virtual_phone_delivery?: boolean;
  virtual_phone_console_url?: string;
  simulator_url?: string;
  verify_url?: string;
  phone_number?: string;
  message?: string;
  code_preview?: string;
  note?: string;
  error?: string;
}

interface FarmerOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  farmerName: string;
  farmerId: string;
  smsMessage?: string;
  smsInfo?: SmsInfo | null;
  distributionData: {
    bagsGiven: number;
    fertilizerType: string;
  };
}

export function FarmerOTPModal({
  isOpen,
  onClose,
  onVerified,
  onVerify,
  onResend,
  farmerName,
  farmerId,
  smsMessage,
  smsInfo,
  distributionData
}: FarmerOTPModalProps) {
  const { t, language } = useLanguage();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens
      setOtp('');
      setVerificationStatus('idle');
      setError('');
      setIsLocked(false);
    }
  }, [isOpen, farmerName]);

  const handleVerify = async () => {
    if (otp.length !== 4) {
      setError(t('invalidOtp'));
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setError('');

    try {
      await onVerify(otp);
      setVerificationStatus('success');
      setIsLocked(true);

      setTimeout(() => {
        onVerified();
      }, 1000);
    } catch (err) {
      setVerificationStatus('error');
      setError(err instanceof Error ? err.message : t('invalidOtp'));
      setOtp('');
    }

    setIsVerifying(false);
  };

  const handleResendOtp = async () => {
    setOtp('');
    setError('');
    setVerificationStatus('idle');
    try {
      await onResend();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidOtp'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className={`transition-all duration-500 ${isLocked ? 'rotate-0' : 'rotate-12'}`}>
              {isLocked ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Shield className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-xl font-semibold">{t('otpVerification')}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Farmer Information */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('farmerName')}</p>
                <p className="font-semibold text-gray-900">{farmerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('farmerId')}</p>
                <p className="font-semibold text-gray-900">{farmerId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('fertilizerType')}</p>
                <p className="font-semibold text-gray-900">{distributionData.fertilizerType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('bagsGiven')}</p>
                <p className="font-semibold text-purple-600">
                  {distributionData.bagsGiven} {language === 'en' ? 'bags' : 'mifuko'}
                </p>
              </div>
            </div>
          </div>

          {/* SMS sent — modal only opens after successful delivery */}
          <div className="rounded-lg p-3 flex items-start gap-2 border bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                {t('otpSentTo')}
                {smsInfo?.phone_number ? ` ${smsInfo.phone_number}` : ''}
              </p>
              <p className="text-xs text-green-800 mt-1">
                {smsInfo?.virtual_phone_delivery
                  ? language === 'en'
                    ? 'Twilio trial: open Virtual Phone in the Twilio Console (link below), read the OTP, then enter it here.'
                    : 'Majaribio ya Twilio: fungua Virtual Phone kwenye Twilio Console (kiungo hapa chini), soma OTP, kisha ingiza hapa.'
                  : language === 'en'
                    ? 'The farmer should see an SMS notification on their phone. Enter the 4-digit code below once they share it.'
                    : 'Mkulima anapaswa kuona arifa ya SMS kwenye simu. Ingiza namba ya tarakimu 4 hapa chini atakapokupa.'}
              </p>
              {smsInfo?.virtual_phone_delivery && smsInfo?.virtual_phone_console_url && (
                <p className="text-xs mt-2">
                  <a
                    href={smsInfo.virtual_phone_console_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-900 underline hover:text-green-950"
                  >
                    {language === 'en'
                      ? 'Open Twilio Virtual Phone'
                      : 'Fungua Twilio Virtual Phone'}
                  </a>
                  {language === 'en'
                    ? ' → click “Virtual Phone” tab to read the SMS.'
                    : ' → bonyeza kichupo “Virtual Phone” kusoma SMS.'}
                </p>
              )}
              {smsInfo?.provider === 'simulated' && smsInfo?.code_preview && (
                <p className="text-xs text-amber-700 mt-2">
                  {language === 'en' ? 'Demo code (simulated)' : 'Namba ya majaribio'}:{' '}
                  <strong>{smsInfo.code_preview}</strong>
                </p>
              )}
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('enterOtp')}
            </label>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError('');
                  setVerificationStatus('idle');
                }}
                disabled={isVerifying || verificationStatus === 'success'}
              >
                <InputOTPGroup>
                  <InputOTPSlot 
                    index={0} 
                    className={`w-14 h-14 text-2xl font-bold ${
                      verificationStatus === 'success' ? 'bg-green-50 border-green-500' :
                      verificationStatus === 'error' ? 'bg-red-50 border-red-500' :
                      'bg-white'
                    }`}
                  />
                  <InputOTPSlot 
                    index={1}
                    className={`w-14 h-14 text-2xl font-bold ${
                      verificationStatus === 'success' ? 'bg-green-50 border-green-500' :
                      verificationStatus === 'error' ? 'bg-red-50 border-red-500' :
                      'bg-white'
                    }`}
                  />
                  <InputOTPSlot 
                    index={2}
                    className={`w-14 h-14 text-2xl font-bold ${
                      verificationStatus === 'success' ? 'bg-green-50 border-green-500' :
                      verificationStatus === 'error' ? 'bg-red-50 border-red-500' :
                      'bg-white'
                    }`}
                  />
                  <InputOTPSlot 
                    index={3}
                    className={`w-14 h-14 text-2xl font-bold ${
                      verificationStatus === 'success' ? 'bg-green-50 border-green-500' :
                      verificationStatus === 'error' ? 'bg-red-50 border-red-500' :
                      'bg-white'
                    }`}
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {verificationStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600 text-sm animate-in fade-in duration-300">
                <CheckCircle className="w-4 h-4" />
                <span>{t('otpSuccess')}</span>
              </div>
            )}
          </div>

          {/* Locking Animation */}
          {verificationStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-3">
                <div className="animate-in zoom-in duration-500">
                  <Lock className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">{t('distributionLocked')}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {language === 'en' 
                      ? 'Transaction verified and secured in trust ledger' 
                      : 'Muamala umethibitishwa na kuhifadhiwa kwenye daftari la uaminifu'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={handleResendOtp}
            disabled={isVerifying || verificationStatus === 'success'}
            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('resendOtp')}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isVerifying || verificationStatus === 'success'}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleVerify}
              disabled={otp.length !== 4 || isVerifying || verificationStatus === 'success'}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {isVerifying && (
                <div className="animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
              )}
              {verificationStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t('verified')}
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {isVerifying ? t('verifying') : t('verifyAndDistribute')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
