/** Strip legacy simulated / Africa's Talking hints from SMS payloads. */
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
  return clean;
}

/**
 * Open the farmer OTP modal after Briq accepts the OTP delivery request.
 * On failure, show a dashboard status message instead of the OTP modal.
 */
export function handleOtpSmsResponse(sms, { onDelivered, onFailed }) {
  const payload = sanitizeSmsPayload(sms);
  if (payload?.delivered) {
    onDelivered(payload);
    return true;
  }
  onFailed(
    payload?.user_message ||
      payload?.note ||
      payload?.error ||
      'SMS could not be sent. Check Briq settings in backend/.env and try again.'
  );
  return false;
}
