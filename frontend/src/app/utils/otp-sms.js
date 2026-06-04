import { getOtpFailureMessage } from './user-messages';

/** Strip legacy simulated hints and internal-only SMS fields before UI use. */
export function sanitizeSmsPayload(sms) {
  if (!sms || typeof sms !== 'object') return sms;
  const note = String(sms.note || '');
  const legacyNote =
    /simulated mode/i.test(note) ||
    /africas_talking/i.test(note) ||
    /sms_provider\s*=\s*simulated/i.test(note);

  const clean = { ...sms };
  if (legacyNote) {
    delete clean.note;
    delete clean.code_preview;
    delete clean.sandbox_mode;
    delete clean.trial_mode;
  }
  if (clean.provider === 'simulated') {
    clean.provider = 'briq';
  }

  delete clean.agent_code;
  delete clean.briq_http_status;
  delete clean.briq_duration_ms;
  delete clean.briq_api_message;
  delete clean.briq_error;
  delete clean.briq_attempted;
  delete clean.backend_reached;
  delete clean.api_accepted;

  return clean;
}

/**
 * Open the farmer OTP modal after Briq accepts the OTP delivery request.
 * On failure, show a dashboard status message instead of the OTP modal.
 */
export function handleOtpSmsResponse(sms, { onDelivered, onFailed, language = 'en' }) {
  const payload = sanitizeSmsPayload(sms);
  if (payload?.delivered) {
    onDelivered(payload);
    return true;
  }
  onFailed(getOtpFailureMessage(payload, language));
  return false;
}
