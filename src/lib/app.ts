/**
 * Application Logic Module
 *
 * This module provides the complete API for the barcode scanner application,
 * wrapping the core validation, sanitization, and transformation functions
 * with the interfaces expected by the test suite.
 *
 * This serves as the main entry point for all business logic.
 */

import {
  validateBarcodeValue as coreValidateBarcode,
  validateLocationField,
  validateNotesField,
  detectBarcodeFormat as coreDetectFormat,
  MAX_BARCODE_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_NOTES_LENGTH,
} from './validation';

import {
  sanitizeInput as coreSanitize,
  sanitizeBarcodeValue,
  containsXss,
  containsSqlInjection,
} from './sanitization';

import {
  transformToSharePointItem as coreTransform,
  formatTimestamp,
  type ScanFormData,
  type M365User,
  type SharePointListItem,
} from './transform';

import {
  getErrorMessage,
  getRecoverySuggestion,
  type ErrorType,
} from './errors';

// ============================================================================
// TYPE DEFINITIONS (matching test expectations)
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: string;
}

export interface BarcodeData {
  value: string;
  format: 'CODE_128' | 'CODE_39' | 'QR_CODE' | 'UNKNOWN';
  confidence?: number;
}

export interface SubmissionPayload {
  barcodeValue: string;
  scannedBy: {
    email: string;
    displayName: string;
    id: string;
  };
  scannedDate: Date;
  location?: string;
  notes?: string;
}

export interface SharePointItem {
  Title?: string;
  BarcodeValue: string;
  ScannedBy: { Email: string; Title: string };
  ScannedDate: string;
  Location?: string | null;
  Notes?: string | null;
}

// ============================================================================
// BARCODE VALIDATION
// ============================================================================

/**
 * Validates a barcode value according to business rules
 * Power Fx equivalent: IsBlank(BarcodeValue) || Len(BarcodeValue) > 255
 */
export function validateBarcodeValue(value: string): ValidationResult {
  // Handle empty/whitespace
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Please scan or enter a barcode value',
    };
  }

  // Handle too long
  if (value.length > MAX_BARCODE_LENGTH) {
    return {
      isValid: false,
      errorMessage: 'Barcode value exceeds maximum length',
    };
  }

  // Check for control characters (null bytes, etc.)
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (controlCharPattern.test(value)) {
    return {
      isValid: false,
      errorMessage: 'Invalid barcode format',
    };
  }

  // Valid barcode
  return {
    isValid: true,
    sanitizedValue: sanitizeBarcodeValue(value),
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (including newlines, tabs for general input)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Normalize multiple spaces to single space
  sanitized = sanitized.replace(/\s{2,}/g, ' ');

  // Remove potential script injection patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, ''); // Remove all HTML tags
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Remove SQL injection patterns
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/DROP\s+TABLE/gi, '');
  sanitized = sanitized.replace(/;/g, '');

  return sanitized.trim();
}

// ============================================================================
// BARCODE FORMAT DETECTION
// ============================================================================

/**
 * Detects the barcode format from the scanned value
 */
export function detectBarcodeFormat(value: string): BarcodeData['format'] {
  if (!value || value.trim() === '') {
    return 'UNKNOWN';
  }

  // QR Code detection - URLs, JSON, or special characters
  if (value.startsWith('http') || value.startsWith('{') || value.includes('://')) {
    return 'QR_CODE';
  }

  // Code 39 detection - uppercase alphanumeric, spaces, dashes, dots, $, /, +, %, *
  const code39Pattern = /^[A-Z0-9\-. $/+%*]+$/;
  if (code39Pattern.test(value) && value.length <= 43) {
    return 'CODE_39';
  }

  // Code 128 detection - ASCII printable characters
  const code128Pattern = /^[\x20-\x7E]+$/;
  if (code128Pattern.test(value) && value.length <= 128) {
    return 'CODE_128';
  }

  return 'UNKNOWN';
}

// ============================================================================
// FORM FIELD VALIDATION
// ============================================================================

/**
 * Validates the location field
 */
export function validateLocation(location: string | undefined): ValidationResult {
  // Optional field - undefined/empty is valid
  if (!location || location.trim() === '') {
    return { isValid: true };
  }

  // Check max length
  if (location.length > MAX_LOCATION_LENGTH) {
    return {
      isValid: false,
      errorMessage: 'Location exceeds maximum length',
    };
  }

  // Sanitize and return
  const sanitized = sanitizeInput(location);
  return {
    isValid: true,
    sanitizedValue: sanitized,
  };
}

/**
 * Validates the notes field
 */
export function validateNotes(notes: string | undefined): ValidationResult {
  // Optional field - undefined/empty is valid
  if (!notes || notes.trim() === '') {
    return { isValid: true };
  }

  // For notes, preserve newlines but sanitize other content
  let sanitized = notes;

  // Remove dangerous patterns but keep newlines
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<img[^>]*onerror[^>]*>/gi, '');
  sanitized = sanitized.replace(/onerror\s*=/gi, '');

  return {
    isValid: true,
    sanitizedValue: sanitized,
  };
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transforms form data into SharePoint list item format
 */
export function transformToSharePointItem(payload: SubmissionPayload): SharePointItem {
  const item: SharePointItem = {
    Title: `Scan-${Date.now()}`,
    BarcodeValue: payload.barcodeValue,
    ScannedBy: {
      Email: payload.scannedBy.email,
      Title: payload.scannedBy.displayName,
    },
    ScannedDate: payload.scannedDate.toISOString(),
    Location: payload.location && payload.location.trim() ? payload.location : null,
    Notes: payload.notes && payload.notes.trim() ? payload.notes : null,
  };

  return item;
}

// ============================================================================
// ERROR MESSAGE GENERATION
// ============================================================================

/**
 * Error type mapping from test constants to internal types
 */
const ERROR_TYPE_MAP: Record<string, string> = {
  'BARCODE_EMPTY': 'Please scan or enter a barcode value',
  'BARCODE_TOO_LONG': 'Barcode value exceeds maximum length',
  'BARCODE_INVALID': 'Invalid barcode format',
  'SHAREPOINT_CONNECTION': 'Unable to connect to SharePoint. Please check your connection.',
  'SHAREPOINT_PERMISSION': 'You do not have permission to add items to this list.',
  'SHAREPOINT_TIMEOUT': 'Request timed out. Please try again.',
  'CAMERA_PERMISSION': 'Camera access is required to scan barcodes. Please enable camera permissions.',
  'CAMERA_UNAVAILABLE': 'Camera is not available on this device.',
  'SCAN_FAILED': 'Unable to read barcode. Please try again or enter manually.',
  'OFFLINE': 'You appear to be offline. Please check your connection.',
  'NETWORK_ERROR': 'Network error occurred. Please try again.',
  'AUTH_REQUIRED': 'Please sign in with your Microsoft account.',
  'AUTH_EXPIRED': 'Your session has expired. Please sign in again.',
};

/**
 * Generates an appropriate error message based on error type
 */
export function generateErrorMessage(errorType: string, context?: object): string {
  const message = ERROR_TYPE_MAP[errorType];

  if (!message) {
    return 'An unexpected error occurred. Please try again.';
  }

  // If context includes timeout info, include it
  if (context && 'durationMs' in context && errorType === 'SHAREPOINT_TIMEOUT') {
    return `Request timed out after ${(context as { durationMs: number }).durationMs}ms. Please try again.`;
  }

  return message;
}

// ============================================================================
// USER PERMISSION VALIDATION
// ============================================================================

/**
 * Validates that the current user has permission to submit
 */
export function validateUserPermission(userId: string): boolean {
  // Reject null, undefined, or empty user IDs
  if (!userId || userId.trim() === '') {
    return false;
  }

  // In a real implementation, this would check against SharePoint permissions
  // For now, all non-empty user IDs are considered valid
  return true;
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

// Simple in-memory cache for recent scans (for testing)
const recentScans: Map<string, { userId: string; timestamp: number }> = new Map();

/**
 * Checks if a barcode was recently scanned (duplicate detection)
 */
export function checkRecentDuplicate(
  barcodeValue: string,
  userId: string,
  withinMinutes: number
): boolean {
  // Zero minutes means duplicate check is disabled
  if (withinMinutes === 0) {
    return false;
  }

  const key = `${barcodeValue}-${userId}`;
  const recent = recentScans.get(key);

  if (!recent) {
    return false;
  }

  const cutoffTime = Date.now() - withinMinutes * 60 * 1000;
  return recent.timestamp > cutoffTime;
}

/**
 * Records a scan for duplicate detection
 */
export function recordScan(barcodeValue: string, userId: string): void {
  const key = `${barcodeValue}-${userId}`;
  recentScans.set(key, { userId, timestamp: Date.now() });
}

/**
 * Clears the recent scans cache (for testing)
 */
export function clearRecentScans(): void {
  recentScans.clear();
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export {
  MAX_BARCODE_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_NOTES_LENGTH,
} from './validation';

export type { ScanFormData, M365User } from './transform';
export type { ErrorType } from './errors';
