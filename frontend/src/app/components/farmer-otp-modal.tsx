import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Phone, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { useLanguage } from './language-context';
import { Logo } from './logo';
import { otpLoadingLabel } from '../utils/distribution-otp';
import { getUserMessage } from '../utils/user-messages';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface SmsInfo {
  delivery_method?: string;
  phone_number?: string;
  message?: string;
  user_message?: string;
  handset_note?: string;
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

function formatPhoneDisplay(phone?: string) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('255') ? `+${digits}` : `+${digits}`;
}

export function FarmerOTPModal({
  isOpen,
  onClose,
  onVerified,
  onVerify,
  onResend,
  farmerName,
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
      setTimeout(() => onVerified(), 700);
    } catch (err) {
      setVerificationStatus('error');
      setError(getUserMessage(err, t('invalidOtp')));
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
    try {
      await onResend(deliveryMethod ? { delivery_method: deliveryMethod } : undefined);
    } catch (err) {
      setError(getUserMessage(err, t('invalidOtp')));
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const canVerify =
    otp.length === otpLength &&
    !isVerifying &&
    !isResending &&
    verificationStatus !== 'success';

  const phoneDisplay = formatPhoneDisplay(smsInfo?.phone_number);
  const deliveryMethod = smsInfo?.delivery_method || 'sms';

  const channelLabel =
    deliveryMethod === 'call'
      ? language === 'en'
        ? 'Call'
        : 'Simu'
      : deliveryMethod === 'whatsapp'
        ? 'WhatsApp'
        : 'SMS';

  const summaryLine =
    language === 'en'
      ? `${farmerName} · ${distributionData.bagsGiven} bags ${distributionData.fertilizerType}`
      : `${farmerName} · mifuko ${distributionData.bagsGiven} ${distributionData.fertilizerType}`;

  const deliveryLine = phoneDisplay
    ? language === 'en'
      ? `${channelLabel} → ${phoneDisplay}`
      : `${channelLabel} → ${phoneDisplay}`
    : language === 'en'
      ? `Code sent via ${channelLabel}`
      : `Nambari imetumwa kupitia ${channelLabel}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-otp-title"
    >
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        {isResending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 px-6 text-center">
            <RefreshCw className="mb-2 h-6 w-6 animate-spin text-green-600" />
            <p className="text-sm font-medium text-gray-900">
              {otpLoadingLabel('api', language, deliveryMethod)}
            </p>
          </div>
        )}

        <div className="px-6 pb-4 pt-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-50 ring-1 ring-green-100">
            <Logo size="sm" showText={false} theme="dark" />
          </div>

          <h2 id="farmer-otp-title" className="text-lg font-semibold tracking-tight text-gray-900">
            {t('otpVerification')}
          </h2>

          <p className="mt-1.5 text-sm font-medium text-gray-800">{summaryLine}</p>
          <p className="mt-0.5 text-xs text-gray-500">{deliveryLine}</p>
        </div>

        <div className="px-6 pb-2">
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
                    className="h-12 w-10 rounded-lg border border-gray-200 bg-white text-lg font-semibold text-gray-900 shadow-sm first:rounded-lg last:rounded-lg data-[active=true]:border-green-500 data-[active=true]:ring-2 data-[active=true]:ring-green-500/20"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            {language === 'en' ? "No code? " : 'Hakuna nambari? '}
            <button
              type="button"
              onClick={() => handleResendOtp()}
              disabled={isVerifying || isResending || verificationStatus === 'success'}
              className="font-semibold text-gray-800 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {language === 'en' ? 'Resend SMS' : 'Tuma tena'}
            </button>
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleResendOtp('call')}
              disabled={isVerifying || isResending || verificationStatus === 'success'}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-medium text-gray-900 transition-colors hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Phone className="h-4 w-4 text-green-700" />
              <span>{language === 'en' ? 'Phone call' : 'Simu'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleResendOtp('whatsapp')}
              disabled={isVerifying || isResending || verificationStatus === 'success'}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-medium text-gray-900 transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              <span>WhatsApp</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('otpSuccess')}</span>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 px-5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying || isResending}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => handleVerify(otp)}
              disabled={!canVerify}
              className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isVerifying ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t('verifying')}
                </span>
              ) : verificationStatus === 'success' ? (
                t('verified')
              ) : (
                t('verifyCode')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
