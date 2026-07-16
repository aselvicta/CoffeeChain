/**
 * Shared client-side form validation for CoffeeChain.
 * Tanzania phone rules follow local mobile MSISDNs (+255 / 0 + 9 digits, prefix 6 or 7).
 */

export const TZ_PHONE_PREFIX = '+255 ';
export const TZ_PHONE_PLACEHOLDER = '+255 7XX XXX XXX';

/** Digits only, country code 255 when present. */
export function normalizePhoneDigits(value) {
  let raw = String(value || '').replace(/\D/g, '');
  if (raw.startsWith('00')) raw = raw.slice(2);
  if (raw.startsWith('0') && raw.length >= 9) raw = `255${raw.slice(1)}`;
  if (raw.length === 9 && /^[67]/.test(raw)) raw = `255${raw}`;
  return raw;
}

/**
 * Valid Tanzania mobile: 255 + 9 digits starting with 6 or 7
 * (Vodacom, Airtel, Yas/Tigo, Halotel, etc.).
 */
export function isValidTanzaniaPhone(value) {
  const digits = normalizePhoneDigits(value);
  return /^255[67]\d{8}$/.test(digits);
}

/**
 * Keep +255 prefix while typing; allow digits/spaces after it.
 * Returns the next input value (never strips the country code).
 */
export function sanitizeTanzaniaPhoneInput(raw) {
  const value = String(raw ?? '');
  if (!value.startsWith('+255')) return TZ_PHONE_PREFIX;

  const digitsOnly = value.slice(4).replace(/\D/g, '').slice(0, 9);
  if (!digitsOnly) return TZ_PHONE_PREFIX;

  let formatted = '';
  if (digitsOnly.length <= 3) formatted = digitsOnly;
  else if (digitsOnly.length <= 6) formatted = `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3)}`;
  else formatted = `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;

  return `+255 ${formatted}`;
}

/** Display/storage form: "+255 7XX XXX XXX" */
export function formatTanzaniaPhone(value) {
  const digits = normalizePhoneDigits(value);
  if (!/^255\d{9}$/.test(digits)) return ensureTanzaniaPhonePrefix(value);
  const local = digits.slice(3);
  return `+255 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function ensureTanzaniaPhonePrefix(value) {
  const v = String(value || '').trim();
  if (!v) return TZ_PHONE_PREFIX;
  if (v.startsWith('+255')) return sanitizeTanzaniaPhoneInput(v);
  const digits = normalizePhoneDigits(v);
  if (digits.startsWith('255')) {
    return sanitizeTanzaniaPhoneInput(`+255 ${digits.slice(3)}`);
  }
  return sanitizeTanzaniaPhoneInput(`${TZ_PHONE_PREFIX}${v.replace(/^0/, '')}`);
}

export function tanzaniaPhoneError(value, { required = true } = {}) {
  const trimmed = String(value || '').trim();
  const empty = !trimmed || trimmed === '+255' || trimmed === TZ_PHONE_PREFIX.trim();
  if (empty) return required ? 'Enter a Tanzania phone number (+255…).' : '';
  if (!isValidTanzaniaPhone(trimmed)) {
    return 'Enter a valid Tanzania mobile number (e.g. +255 7XX XXX XXX).';
  }
  return '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function isValidEmail(value) {
  const email = String(value || '').trim();
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

export function emailError(value, { required = true } = {}) {
  const email = String(value || '').trim();
  if (!email) return required ? 'Email is required.' : '';
  if (!isValidEmail(email)) return 'Enter a valid email address (e.g. name@example.com).';
  return '';
}

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Password rules for account creation / password change:
 * - min 8 chars
 * - at least one lowercase, one uppercase, one digit
 * - at least one special character
 */
export function getPasswordChecks(password) {
  const value = String(password || '');
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    hasLower: /[a-z]/.test(value),
    hasUpper: /[A-Z]/.test(value),
    hasDigit: /\d/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  };
}

export function isStrongPassword(password) {
  const c = getPasswordChecks(password);
  return c.minLength && c.hasLower && c.hasUpper && c.hasDigit && c.hasSpecial;
}

export function passwordError(password, { required = true } = {}) {
  const value = String(password || '');
  if (!value) return required ? 'Password is required.' : '';
  if (!isStrongPassword(value)) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include uppercase, lowercase, a number, and a special character.`;
  }
  return '';
}

export function passwordConfirmError(password, confirm) {
  if (!String(confirm || '')) return 'Confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}

export function requiredError(value, label = 'This field') {
  if (String(value ?? '').trim()) return '';
  return `${label} is required.`;
}

export function usernameError(value, { required = true, minLength = 3 } = {}) {
  const username = String(value || '').trim();
  if (!username) return required ? 'Username is required.' : '';
  if (username.length < minLength) return `Username must be at least ${minLength} characters.`;
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return 'Username may only contain letters, numbers, dots, hyphens, and underscores.';
  }
  return '';
}

export const PASSWORD_REQUIREMENTS = [
  { key: 'minLength', label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: 'hasLower', label: 'One lowercase letter' },
  { key: 'hasUpper', label: 'One uppercase letter' },
  { key: 'hasDigit', label: 'One number' },
  { key: 'hasSpecial', label: 'One special character (!@#$%…)' },
];
