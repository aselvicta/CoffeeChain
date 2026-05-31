/**
 * Open the farmer OTP modal only after SMS was delivered to the handset.
 * On failure, show a dashboard status message instead of the OTP modal.
 */
export function handleOtpSmsResponse(sms, { onDelivered, onFailed }) {
  if (sms?.delivered) {
    onDelivered(sms);
    return true;
  }
  onFailed(
    sms?.user_message ||
      sms?.note ||
      sms?.error ||
      'SMS could not be sent. Check SMS provider settings and try again.'
  );
  return false;
}
