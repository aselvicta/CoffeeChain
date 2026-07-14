const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FRIENDLY_BY_PATTERN = [
  [/insufficient credits/i, 'SMS service credits are low. Please contact your system administrator.'],
  [/BRIQ_API_KEY|BRIQ_APP_KEY|backend\/\.env|SMS_PROVIDER/i, 'Verification messages are temporarily unavailable. Please try again later or contact support.'],
  [/Invalid OTP|invalid otp/i, 'That code is incorrect. Check the message on the farmer\'s phone and try again.'],
  [/OTP expired/i, 'This code has expired. Request a new verification code.'],
  [/session has expired|token/i, 'Your session has expired. Please sign in again.'],
  [/No active account|Invalid username|authentication/i, 'Incorrect username or password.'],
  [/network|failed to fetch|load failed/i, 'Could not reach the server. Check your connection and try again.'],
];

function looksTechnical(message) {
  if (!message || typeof message !== 'string') return true;
  const text = message.trim();
  if (!text) return true;
  if (text.startsWith('{') || text.startsWith('[')) return true;
  if (/HTTP \d{3}/i.test(text)) return true;
  if (/\.env|send_otp|briq_|backend_reached|traceback|Exception/i.test(text)) return true;
  if (text.length > 220) return true;
  return false;
}

function mapFriendlyMessage(message) {
  for (const [pattern, friendly] of FRIENDLY_BY_PATTERN) {
    if (pattern.test(message)) return friendly;
  }
  return message;
}

function extractDetail(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.detail)) return payload.detail.join(' ');
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.error === 'string') return payload.error;

  // Field-level validation errors — include the field name so it's actionable
  const fieldEntries = Object.entries(payload).filter(([, v]) => v);
  const fieldMessages = fieldEntries.flatMap(([field, value]) => {
    const msgs = Array.isArray(value) ? value : [value];
    return msgs
      .filter((m) => typeof m === 'string')
      .map((m) => {
        const label = field.replace(/_/g, ' ');
        return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${m}`;
      });
  });
  if (fieldMessages.length) return fieldMessages.join(' · ');

  return '';
}

/**
 * Turn API / thrown errors into short, user-safe copy (no stack traces or config hints).
 */
export function getUserMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message || '';
  } else {
    raw = extractDetail(error);
  }

  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      raw = extractDetail(parsed) || fallback;
    } catch {
      return fallback;
    }
  }

  const detail = extractDetail(typeof error === 'object' && !(error instanceof Error) ? error : null);
  if (detail && !raw) raw = detail;

  if (!raw || looksTechnical(raw)) {
    const mapped = mapFriendlyMessage(raw);
    if (mapped && !looksTechnical(mapped)) return mapped;
    return fallback;
  }

  return mapFriendlyMessage(raw);
}

export function getOtpFailureMessage(sms, language = 'en') {
  const payload = sms && typeof sms === 'object' ? sms : {};
  const fromSms = payload.user_message || payload.message;
  if (fromSms && !looksTechnical(fromSms)) {
    return fromSms;
  }
  return language === 'sw'
    ? 'Nambari ya uthibitisho haikutumwa. Jaribu tena au tumia simu/WhatsApp.'
    : 'We could not send a verification code. Try again or use phone call / WhatsApp.';
}

export { MONTH_LABELS };
