/**
 * Common Phone Validation and Normalization Utilities for Admin
 */

export function normalizeIndianPhone(raw) {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidIndianPhone(phone) {
  if (!phone) return false;
  const digits = normalizeIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

export function sanitizePhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

