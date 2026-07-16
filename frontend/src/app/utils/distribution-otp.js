import { isValidTanzaniaPhone } from './form-validation';

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
    throw new Error('Could not request verification code.');
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
  return isValidTanzaniaPhone(farmer?.phone || farmer?.phone_number || '');
}

const METHOD_LABELS = {
  en: {
    sms: 'Sending verification code by SMS…',
    call: 'Calling the farmer\'s phone…',
    whatsapp: 'Sending verification code on WhatsApp…',
    default: 'Sending verification code…',
    create: 'Recording distribution…',
    api: 'Sending verification code…',
    done: 'Code sent — check the farmer\'s phone',
  },
  sw: {
    sms: 'Inatumia SMS kutuma nambari…',
    call: 'Inapiga simu ya mkulima…',
    whatsapp: 'Inatumia WhatsApp kutuma nambari…',
    default: 'Inatuma nambari ya uthibitisho…',
    create: 'Inahifadhi usambazaji…',
    api: 'Inatuma nambari ya uthibitisho…',
    done: 'Nambari imetumwa — angalia simu ya mkulima',
  },
};

export function otpLoadingLabel(phase, language = 'en', deliveryMethod) {
  const labels = METHOD_LABELS[language] || METHOD_LABELS.en;
  if (phase === 'create') return labels.create;
  if (phase === 'api') return labels.api;
  if (phase === 'done') return labels.done;
  return labels[deliveryMethod] || labels.default;
}

/** @deprecated Delivery status is shown via sms.message in the OTP modal. */
export function formatOtpDeliveryStatus() {
  return '';
}
