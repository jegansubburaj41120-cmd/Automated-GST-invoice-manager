/**
 * GSTIN Regex Pattern
 * Example: 27ABCDE1234F1Z5
 * 2 digits State Code, 10 chars PAN, 1 entity digit, 1 'Z' default, 1 checksum
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * PAN Regex Pattern
 * Example: ABCDE1234F
 */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function isValidGSTIN(gstin) {
  if (!gstin) return true; // optional for unregistered
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function isValidPAN(pan) {
  if (!pan) return true;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}
