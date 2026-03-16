/**
 * Barcode Scanner Validation Library
 *
 * This module contains all validation logic for the Power Apps barcode scanner.
 * These functions document the expected behavior and can be used in:
 * - Unit tests (TDD)
 * - Azure Functions (if extended later)
 * - Custom connectors
 *
 * Requirements covered: FR-02, FR-03, FR-05, FR-16, NFR-03
 */

// Constants
export const MAX_BARCODE_LENGTH = 128;
export const MAX_LOCATION_LENGTH = 255;
export const MAX_NOTES_LENGTH = 1000;

// Barcode format patterns
const BARCODE_PATTERNS = {
  CODE_128: /^[\x00-\x7F]{1,128}$/, // ASCII characters
  CODE_39: /^[A-Z0-9\-. $/+%*]{1,43}$/, // Code 39 character set
  QR_CODE: /^[\s\S]{1,4296}$/, // QR codes can contain up to 4296 alphanumeric chars
} as const;

export type BarcodeFormat = keyof typeof BARCODE_PATTERNS | 'UNKNOWN';

/**
 * Validates a barcode value
 * Requirements: FR-02, FR-03, FR-16
 *
 * @param value - The scanned or entered barcode value
 * @returns Object with isValid boolean and optional error message
 */
export function validateBarcodeValue(value: string): { isValid: boolean; error?: string } {
  // Check for empty/null
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Barcode value is required' };
  }

  // Check length
  if (value.length > MAX_BARCODE_LENGTH) {
    return {
      isValid: false,
      error: `Barcode exceeds maximum length of ${MAX_BARCODE_LENGTH} characters`
    };
  }

  // Check for control characters (except standard whitespace)
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (controlCharPattern.test(value)) {
    return { isValid: false, error: 'Barcode contains invalid control characters' };
  }

  // Detect and validate format
  const format = detectBarcodeFormat(value);
  if (format === 'UNKNOWN') {
    // Still allow unknown formats, just warn
    return { isValid: true };
  }

  return { isValid: true };
}

/**
 * Detects the barcode format based on the value pattern
 * Requirement: FR-02
 *
 * @param value - The barcode value to analyze
 * @returns The detected barcode format
 */
export function detectBarcodeFormat(value: string): BarcodeFormat {
  if (!value) return 'UNKNOWN';

  // Check Code 39 first (more restrictive)
  if (BARCODE_PATTERNS.CODE_39.test(value)) {
    return 'CODE_39';
  }

  // Check Code 128 (ASCII)
  if (BARCODE_PATTERNS.CODE_128.test(value) && value.length <= 128) {
    return 'CODE_128';
  }

  // Check QR Code (very permissive)
  if (BARCODE_PATTERNS.QR_CODE.test(value)) {
    return 'QR_CODE';
  }

  return 'UNKNOWN';
}

/**
 * Validates the optional location field
 * Requirement: FR-15, FR-20
 *
 * @param location - The location string
 * @returns Validation result
 */
export function validateLocationField(location: string | undefined | null): { isValid: boolean; error?: string } {
  // Optional field - empty is valid
  if (!location || location.trim() === '') {
    return { isValid: true };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    return {
      isValid: false,
      error: `Location exceeds maximum length of ${MAX_LOCATION_LENGTH} characters`
    };
  }

  return { isValid: true };
}

/**
 * Validates the optional notes field
 * Requirement: FR-15, FR-20
 *
 * @param notes - The notes string
 * @returns Validation result
 */
export function validateNotesField(notes: string | undefined | null): { isValid: boolean; error?: string } {
  // Optional field - empty is valid
  if (!notes || notes.trim() === '') {
    return { isValid: true };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return {
      isValid: false,
      error: `Notes exceed maximum length of ${MAX_NOTES_LENGTH} characters`
    };
  }

  return { isValid: true };
}

/**
 * Validates all form fields together
 * Requirements: FR-03, FR-15, FR-16, FR-20
 *
 * @param data - The form data object
 * @returns Validation result with all errors
 */
export function validateFormData(data: {
  barcodeValue: string;
  location?: string;
  notes?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const barcodeResult = validateBarcodeValue(data.barcodeValue);
  if (!barcodeResult.isValid && barcodeResult.error) {
    errors.push(barcodeResult.error);
  }

  const locationResult = validateLocationField(data.location);
  if (!locationResult.isValid && locationResult.error) {
    errors.push(locationResult.error);
  }

  const notesResult = validateNotesField(data.notes);
  if (!notesResult.isValid && notesResult.error) {
    errors.push(notesResult.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
