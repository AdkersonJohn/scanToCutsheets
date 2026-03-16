/**
 * Barcode Scanner Library
 *
 * Core validation, sanitization, and transformation logic
 * for the Power Apps barcode scanner application.
 */

// Validation
export {
  validateBarcodeValue,
  validateLocationField,
  validateNotesField,
  validateFormData,
  detectBarcodeFormat,
  MAX_BARCODE_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_NOTES_LENGTH,
} from './validation';

export type { BarcodeFormat } from './validation';

// Sanitization
export {
  sanitizeInput,
  sanitizeForDisplay,
  sanitizeBarcodeValue,
  containsSqlInjection,
  containsXss,
  sanitizeWithWarnings,
} from './sanitization';

// Data Transformation
export {
  transformToSharePointItem,
  formatTimestamp,
  formatDisplayDate,
  generateItemTitle,
  mapUserToSharePointId,
  createSessionHistoryEntry,
  validateSharePointItem,
} from './transform';

export type {
  ScanFormData,
  M365User,
  SharePointListItem,
  SharePointPersonField,
} from './transform';

// Error Handling
export {
  getErrorMessage,
  getRecoverySuggestion,
  createErrorResponse,
  mapSharePointError,
  mapScannerError,
  isRecoverableError,
  AppError,
} from './errors';

export type { ErrorType } from './errors';
