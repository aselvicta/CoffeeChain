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
import { formatOtpDeliveryStatus, otpLoadingLabel } from '../utils/distribution-otp';

interface SmsInfo {
  provider?: string;
  delivered?: boolean;
  delivery_method?: string;
  phone_number?: string;
  message?: string;
  note?: string;
  error?: string;
  transfer_id?: number;
  sent_at?: string;
  backend_reached?: boolean;
  briq_duration_ms?: number;
  briq_http_status?: number;
  briq_api_message?: string;
  handset_note?: string;
  agent_code?: string;
  briq_attempted?: boolean;
  is_resend?: boolean;
}

interface FarmerOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: (options?: { delivery_method?: string }) => Promise<void>;
  farmerName: string;
  farmerId: string;
  transferId?: number;
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
  transferId,
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
  const [resendMethod, setResendMethod] = useState<string | null>(null);

  const otpLabel =
    language === 'en'
      ? `Enter ${otpLength}-digit OTP code`
      : `Weka nambari ya OTP ya tarakimu ${otpLength}`;

  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setVerificationStatus('idle');
      setError('');
      setResendMethod(null);
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

  const handleResendOtp = async (deliveryMethod?: string) => {
    setOtp('');
    setError('');
    setVerificationStatus('idle');
    setIsResending(true);
    setResendMethod(deliveryMethod || 'sms');
    try {
      await onResend(deliveryMethod ? { delivery_method: deliveryMethod } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidOtp'));
    } finally {
      setIsResending(false);
      setResendMethod(null);
    }
  };

  if (!isOpen) return null;

  const canVerify =
    otp.length === otpLength &&
    !isVerifying &&
    !isResending &&
    verificationStatus !== 'success';

  const activeMethod = isResending
    ? resendMethod || 'sms'
    : smsInfo?.delivery_method || 'sms';

  const deliveryHint =
    smsInfo?.message ||
    (activeMethod === 'call'
      ? language === 'en'
        ? 'Answer the incoming call — Briq will read the code aloud.'
        : 'Kubali simu inayoingia — Briq itasoma nambari kwa sauti.'
      : activeMethod === 'whatsapp'
        ? language === 'en'
          ? 'Check WhatsApp on the farmer phone for the code.'
          : 'Angalia WhatsApp kwenye simu ya mkulima kwa nambari.'
        : language === 'en'
          ? `Check SMS on the farmer phone for the ${otpLength}-digit code.`
          : `Angalia SMS kwenye simu ya mkulima kwa nambari ya tarakimu ${otpLength}.`);

  const deliveryStatusLine = formatOtpDeliveryStatus(smsInfo, language);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/25 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-otp-title"
    >
      <div className="relative w-full max-w-[400px] rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {isResending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/90 px-6 text-center">
            <RefreshCw className="mb-3 h-8 w-8 animate-spin text-green-600" />
            <p className="text-sm font-medium text-gray-900">
              {otpLoadingLabel('api', language, activeMethod)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {language === 'en'
                ? 'Waiting for CoffeeChain backend and Briq…'
                : 'Inasubiri backend na Briq…'}
            </p>
          </div>
        )}

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
            <Logo size="sm" showText={false} theme="dark" />
          </div>
          <h2 id="farmer-otp-title" className="text-lg font-semibold text-gray-900">
            {t('otpVerification')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{otpLabel}</p>
          {(transferId || smsInfo?.transfer_id) && (
            <p className="mt-1 text-xs text-gray-400">
              Transfer #{transferId || smsInfo?.transfer_id}
            </p>
          )}
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

        <div
          className={`mb-5 flex items-start gap-2 rounded-xl border p-3 ${
            isResending
              ? 'border-blue-200 bg-blue-50'
              : 'border-green-200 bg-green-50'
          }`}
        >
          {isResending ? (
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          )}
          <div className="text-sm text-gray-800">
            <p className="font-medium text-gray-900">
              {isResending
                ? otpLoadingLabel('api', language, activeMethod)
                : `${t('otpSentTo')}${
                    smsInfo?.phone_number
                      ? ` +${smsInfo.phone_number.replace(/^\+/, '')}`
                      : ''
                  }`}
            </p>
            {!isResending && <p className="mt-1 text-xs">{deliveryHint}</p>}
            {deliveryStatusLine && !isResending && (
              <p className="mt-2 text-xs font-medium text-green-800">{deliveryStatusLine}</p>
            )}
            {smsInfo?.briq_api_message && !isResending && (
              <p className="mt-1 text-xs text-gray-600">Briq: {smsInfo.briq_api_message}</p>
            )}
            {smsInfo?.handset_note && !isResending && smsInfo?.delivery_method === 'sms' && (
              <p className="mt-2 text-xs text-amber-800">{smsInfo.handset_note}</p>
            )}
          </div>
        </div>

        {smsInfo?.agent_code && !isResending && (
          <div className="mb-5 rounded-xl border-2 border-green-600 bg-green-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-green-800">
              {language === 'en' ? 'Agent verification code' : 'Nambari ya wakala'}
            </p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.35em] text-green-900">
              {smsInfo.agent_code}
            </p>
            <p className="mt-2 text-xs text-green-800">
              {language === 'en'
                ? 'Share with the farmer if SMS/call did not arrive, then enter it above.'
                : 'Shiriki na mkulima kama SMS haikufika, kisha weka hapa.'}
            </p>
          </div>
        )}

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
              disabled={isVerifying || isResending || verificationStatus === 'success'}
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

          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              {language === 'en'
                ? 'No code yet? Try another delivery method:'
                : 'Hakuna nambari? Jaribu njia nyingine:'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleResendOtp('sms')}
                disabled={isVerifying || isResending || verificationStatus === 'success'}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => handleResendOtp('call')}
                disabled={isVerifying || isResending || verificationStatus === 'success'}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {language === 'en' ? 'Phone call' : 'Simu'}
              </button>
              <button
                type="button"
                onClick={() => handleResendOtp('whatsapp')}
                disabled={isVerifying || isResending || verificationStatus === 'success'}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                WhatsApp
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleResendOtp()}
                disabled={isVerifying || isResending || verificationStatus === 'success'}
                className="inline-flex items-center gap-1.5 font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                {t('resendOtp')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isVerifying || isResending}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
