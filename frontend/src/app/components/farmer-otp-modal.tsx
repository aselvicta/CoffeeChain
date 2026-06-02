import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  X,
} from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { useLanguage } from './language-context';
import { Logo } from './logo';

interface SmsInfo {
  provider?: string;
  delivered?: boolean;
  delivery_method?: string;
  api_accepted?: boolean;
  sandbox_mode?: boolean;
  trial_mode?: boolean;
  virtual_phone_delivery?: boolean;
  virtual_phone_console_url?: string;
  simulator_url?: string;
  verify_url?: string;
  phone_number?: string;
  message?: string;
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
  otpLength?: number;
}

export function FarmerOTPModal({
  isOpen,
  onClose,
  onVerified,
  onVerify,
  onResend,
  farmerName,
  farmerId,
  smsInfo,
  distributionData,
  otpLength = 6,
}: FarmerOTPModalProps) {
  const { t, language } = useLanguage();
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'verifying' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const otpLabel =
    language === 'en'
      ? `Enter ${otpLength}-digit OTP code`
      : `Weka nambari ya OTP ya tarakimu ${otpLength}`;

  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setVerificationStatus('idle');
      setError('');
    }
  }, [isOpen, farmerName, otpLength]);

  const handleVerify = async (code: string) => {
    if (code.length !== otpLength) {
      setError(t('invalidOtp'));
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setError('');

    try {
      await onVerify(code);
      setVerificationStatus('success');
      setTimeout(() => onVerified(), 900);
    } catch (err) {
      setVerificationStatus('error');
      setError(err instanceof Error ? err.message : t('invalidOtp'));
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp('');
    setError('');
    setVerificationStatus('idle');
    setIsResending(true);
    try {
      await onResend();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidOtp'));
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const canVerify = otp.length === otpLength && !isVerifying && verificationStatus !== 'success';

  const deliveryHint =
    smsInfo?.message ||
    (smsInfo?.delivery_method === 'call'
      ? language === 'en'
        ? 'Briq is calling the farmer to read the code aloud. Ask them to answer their phone.'
        : 'Briq inapiga simu ya mkulima kusoma nambari. Muombe akubali simu.'
      : language === 'en'
        ? `Ask the farmer for the ${otpLength}-digit code from the SMS on their phone.`
        : `Muulize mkulima nambari ya tarakimu ${otpLength} kutoka SMS kwenye simu yake.`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-otp-title"
    >
      <div className="w-full max-w-[400px] rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
            <Logo size="sm" showText={false} theme="dark" />
          </div>
          <h2 id="farmer-otp-title" className="text-lg font-semibold text-gray-900">
            {t('otpVerification')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{otpLabel}</p>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">{t('farmerName')}</dt>
              <dd className="font-medium text-gray-900">{farmerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('farmerId')}</dt>
              <dd className="font-medium text-gray-900">{farmerId}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('fertilizerType')}</dt>
              <dd className="font-medium text-gray-900">{distributionData.fertilizerType}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{t('bagsGiven')}</dt>
              <dd className="font-medium text-green-700">
                {distributionData.bagsGiven}{' '}
                {language === 'en' ? 'bags' : 'mifuko'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div className="text-sm text-green-800">
            <p className="font-medium text-green-900">
              {t('otpSentTo')}
              {smsInfo?.phone_number ? ` ${smsInfo.phone_number}` : ''}
            </p>
            <p className="mt-1 text-xs">{deliveryHint}</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-center">
            <InputOTP
              maxLength={otpLength}
              value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError('');
                  setVerificationStatus('idle');
                }}
              disabled={isVerifying || verificationStatus === 'success'}
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: otpLength }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 w-10 rounded-lg border-2 border-gray-300 bg-white text-lg font-semibold text-gray-900 first:rounded-lg last:rounded-lg data-[active=true]:border-green-500 data-[active=true]:ring-2 data-[active=true]:ring-green-500/20"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
              <Lock className="h-4 w-4" />
              <span>{t('otpSuccess')}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleVerify(otp)}
            disabled={!canVerify}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isVerifying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : verificationStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isVerifying
              ? t('verifying')
              : verificationStatus === 'success'
                ? t('verified')
                : t('verifyAndDistribute')}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isVerifying || isResending || verificationStatus === 'success'}
              className="inline-flex items-center gap-1.5 font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              {t('resendOtp')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
