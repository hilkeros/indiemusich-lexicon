/**
 * Cleans an IPI number by removing whitespace, dots, and dashes
 * @param ipi - The IPI number to clean
 * @returns Cleaned IPI number with only digits, or empty string if input is empty
 */
export function cleanIPI(ipi: string | undefined | null): string {
  if (!ipi) return '';
  return ipi.trim().replace(/[\s.\-]/g, '');
}

/**
 * Validates an IPI (Interested Parties Information) number
 * @param ipi - The IPI number to validate
 * @returns true if valid, false otherwise
 */
export function isValidIPI(ipi: string | undefined | null): boolean {
  if (!ipi) return true; // IPI is optional
  
  const cleanedIpi = cleanIPI(ipi);
  return /^\d{11}$/.test(cleanedIpi);
}

/**
 * Returns a descriptive error message for invalid IPI numbers
 */
export const IPI_ERROR_MESSAGE = "IPI number must be exactly 11 digits";

/**
 * Cleans an ISRC by removing whitespace and dashes, and uppercasing
 * @param isrc - The ISRC to clean
 * @returns Cleaned ISRC, or empty string if input is empty
 */
export function cleanISRC(isrc: string | undefined | null): string {
  if (!isrc) return '';
  return isrc.trim().replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Validates an ISRC (International Standard Recording Code)
 * @param isrc - The ISRC to validate
 * @returns true if valid, false otherwise
 */
export function isValidISRC(isrc: string | undefined | null): boolean {
  if (!isrc) return true; // ISRC is optional

  const cleanedISRC = cleanISRC(isrc);
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(cleanedISRC);
}

/**
 * Returns a descriptive error message for invalid ISRC codes
 */
export const ISRC_ERROR_MESSAGE = "ISRC must be 12 characters (CCXXXYYNNNNN)";
