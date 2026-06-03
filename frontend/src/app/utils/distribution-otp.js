/**
 * OTP is sent on transfer create when Briq succeeds.
 * Otherwise explicitly calls POST /api/transfers/{id}/send_otp/.
 */
export async function requestDistributionOtp(transfer, sendOtpFn, options = {}) {
  const { resend = false, delivery_method: deliveryMethod } = options;

  if (
    !resend &&
    transfer?.otp_sent === true &&
    transfer?.sms?.delivered
  ) {
    return {
      sms: transfer.sms,
      otp: transfer.otp,
      otp_code_length: transfer.otp_code_length,
      otp_sent: true,
      source: 'create',
    };
  }

  if (!transfer?.id || !sendOtpFn) {
    throw new Error('Could not request OTP — missing transfer id.');
  }

  const payload = { resend };
  if (deliveryMethod) {
    payload.delivery_method = deliveryMethod;
  }

  const response = await sendOtpFn(transfer.id, payload);
  return { ...response, source: 'send_otp' };
}

/** @deprecated Use requestDistributionOtp */
export async function resolveDistributionOtp(transfer, sendOtpFn) {
  return requestDistributionOtp(transfer, sendOtpFn);
}

export function farmerHasValidPhone(farmer) {
  const raw = String(farmer?.phone || farmer?.phone_number || '').replace(/\D/g, '');
  if (!raw) return false;
  if (raw.startsWith('255')) return raw.length >= 12;
  if (raw.startsWith('0')) return raw.length >= 10;
  return raw.length >= 9;
}

const METHOD_LABELS = {
  en: {
    sms: 'Sending OTP via Briq SMS…',
    call: 'Requesting Briq voice call…',
    whatsapp: 'Sending OTP via Briq WhatsApp…',
    default: 'Contacting Briq to send OTP…',
    create: 'Saving distribution…',
    api: 'Calling backend send_otp…',
    done: 'Briq accepted the request',
  },
  sw: {
    sms: 'Inatumia Briq kutuma SMS…',
    call: 'Inapiga simu kupitia Briq…',
    whatsapp: 'Inatumia Briq WhatsApp…',
    default: 'Inawasiliana na Briq…',
    create: 'Inahifadhi usambazaji…',
    api: 'Inaita backend send_otp…',
    done: 'Briq imekubali ombi',
  },
};

export function otpLoadingLabel(phase, language = 'en', deliveryMethod) {
  const labels = METHOD_LABELS[language] || METHOD_LABELS.en;
  if (phase === 'create') return labels.create;
  if (phase === 'api') return labels.api;
  if (phase === 'done') return labels.done;
  return labels[deliveryMethod] || labels.default;
}

export function formatOtpDeliveryStatus(sms, language = 'en') {
  if (!sms?.backend_reached) return '';
  const method = (sms.delivery_method || 'sms').toUpperCase();
  const ms = sms.briq_duration_ms != null ? `${sms.briq_duration_ms}ms` : '';
  const transfer = sms.transfer_id ? `#${sms.transfer_id}` : '';
  if (language === 'sw') {
    return `Backend + Briq: ${method}${ms ? ` • ${ms}` : ''}${transfer ? ` • ${transfer}` : ''}`;
  }
  return `Backend reached Briq (${method}${ms ? `, ${ms}` : ''}${transfer ? `, transfer ${transfer}` : ''})`;
}
