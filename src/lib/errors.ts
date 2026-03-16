/**
 * Error Handling Library
 *
 * Provides consistent error messages and error handling utilities
 * for the barcode scanner application.
 *
 * Requirement: FR-16 (Clear error messages on failure)
 */

/**
 * Error types that can occur in the application
 */
export type ErrorType =
  | 'VALIDATION_ERROR'
  | 'BARCODE_EMPTY'
  | 'BARCODE_TOO_LONG'
  | 'BARCODE_INVALID_CHARS'
  | 'LOCATION_TOO_LONG'
  | 'NOTES_TOO_LONG'
  | 'SHAREPOINT_CONNECTION'
  | 'SHAREPOINT_PERMISSION'
  | 'SHAREPOINT_TIMEOUT'
  | 'SHAREPOINT_LIST_NOT_FOUND'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'CAMERA_NOT_AVAILABLE'
  | 'CAMERA_PERMISSION_DENIED'
  | 'CAMERA_NOT_SUPPORTED'
  | 'SCAN_FAILED'
  | 'AUTH_EXPIRED'
  | 'AUTH_REQUIRED'
  | 'UNKNOWN_ERROR';

/**
 * Error message definitions
 * Maps error types to user-friendly messages
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  BARCODE_EMPTY: 'Please scan or enter a barcode value.',
  BARCODE_TOO_LONG: 'Barcode value is too long. Maximum 128 characters allowed.',
  BARCODE_INVALID_CHARS: 'Barcode contains invalid characters.',
  LOCATION_TOO_LONG: 'Location is too long. Maximum 255 characters allowed.',
  NOTES_TOO_LONG: 'Notes are too long. Maximum 1000 characters allowed.',
  SHAREPOINT_CONNECTION: 'Unable to connect to SharePoint. Please check your network connection.',
  SHAREPOINT_PERMISSION: 'You do not have permission to add items to this list.',
  SHAREPOINT_TIMEOUT: 'SharePoint request timed out. Please try again.',
  SHAREPOINT_LIST_NOT_FOUND: 'The asset tracking list could not be found.',
  NETWORK_OFFLINE: 'You appear to be offline. Please check your connection.',
  NETWORK_TIMEOUT: 'Network request timed out. Please try again.',
  CAMERA_NOT_AVAILABLE: 'Camera is not available on this device.',
  CAMERA_PERMISSION_DENIED: 'Camera permission was denied. Please enable camera access in settings.',
  CAMERA_NOT_SUPPORTED: 'Barcode scanning is not supported on this device.',
  SCAN_FAILED: 'Unable to read barcode. Please try again or enter manually.',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

/**
 * Error recovery suggestions
 * Provides actionable next steps for each error type
 */
const RECOVERY_SUGGESTIONS: Record<ErrorType, string> = {
  VALIDATION_ERROR: 'Review the highlighted fields and correct any issues.',
  BARCODE_EMPTY: 'Tap the scan button or use manual entry.',
  BARCODE_TOO_LONG: 'Try scanning again or enter a shorter value.',
  BARCODE_INVALID_CHARS: 'Use only standard alphanumeric characters.',
  LOCATION_TOO_LONG: 'Shorten the location description.',
  NOTES_TOO_LONG: 'Shorten your notes.',
  SHAREPOINT_CONNECTION: 'Check your WiFi or mobile data connection.',
  SHAREPOINT_PERMISSION: 'Contact your administrator for list access.',
  SHAREPOINT_TIMEOUT: 'Wait a moment and try submitting again.',
  SHAREPOINT_LIST_NOT_FOUND: 'Contact your administrator to verify the list exists.',
  NETWORK_OFFLINE: 'Connect to WiFi or enable mobile data.',
  NETWORK_TIMEOUT: 'Move to an area with better signal.',
  CAMERA_NOT_AVAILABLE: 'Use manual entry to input the barcode.',
  CAMERA_PERMISSION_DENIED: 'Go to Settings > Privacy > Camera and enable access.',
  CAMERA_NOT_SUPPORTED: 'Use manual entry to input the barcode.',
  SCAN_FAILED: 'Hold the camera steady and ensure good lighting.',
  AUTH_EXPIRED: 'Tap sign in to refresh your session.',
  AUTH_REQUIRED: 'Tap sign in to access the app.',
  UNKNOWN_ERROR: 'Close and reopen the app.',
};

/**
 * Application error class with additional context
 */
export class AppError extends Error {
  readonly type: ErrorType;
  readonly userMessage: string;
  readonly recoverySuggestion: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;

  constructor(type: ErrorType, context?: Record<string, unknown>) {
    super(ERROR_MESSAGES[type]);
    this.type = type;
    this.userMessage = ERROR_MESSAGES[type];
    this.recoverySuggestion = RECOVERY_SUGGESTIONS[type];
    this.timestamp = new Date();
    this.context = context;
    this.name = 'AppError';
  }
}

/**
 * Gets a user-friendly error message for an error type
 * Requirement: FR-16
 *
 * @param type - The error type
 * @returns User-friendly error message
 */
export function getErrorMessage(type: ErrorType): string {
  return ERROR_MESSAGES[type] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Gets a recovery suggestion for an error type
 * Requirement: FR-16, Section 5.3
 *
 * @param type - The error type
 * @returns Recovery suggestion
 */
export function getRecoverySuggestion(type: ErrorType): string {
  return RECOVERY_SUGGESTIONS[type] || RECOVERY_SUGGESTIONS.UNKNOWN_ERROR;
}

/**
 * Creates a full error response object for display
 * Requirement: FR-16
 *
 * @param type - The error type
 * @param context - Optional additional context
 * @returns Error response object
 */
export function createErrorResponse(
  type: ErrorType,
  context?: Record<string, unknown>
): {
  type: ErrorType;
  message: string;
  suggestion: string;
  timestamp: string;
  context?: Record<string, unknown>;
} {
  return {
    type,
    message: getErrorMessage(type),
    suggestion: getRecoverySuggestion(type),
    timestamp: new Date().toISOString(),
    context,
  };
}

/**
 * Determines error type from SharePoint error response
 *
 * @param error - Error from SharePoint connector
 * @returns Mapped error type
 */
export function mapSharePointError(error: { status?: number; message?: string }): ErrorType {
  if (error.status === 401 || error.status === 403) {
    return 'SHAREPOINT_PERMISSION';
  }
  if (error.status === 404) {
    return 'SHAREPOINT_LIST_NOT_FOUND';
  }
  if (error.status === 408 || error.message?.includes('timeout')) {
    return 'SHAREPOINT_TIMEOUT';
  }
  if (error.message?.includes('network') || error.message?.includes('offline')) {
    return 'NETWORK_OFFLINE';
  }
  return 'SHAREPOINT_CONNECTION';
}

/**
 * Determines error type from camera/scanner error
 *
 * @param error - Error from barcode scanner
 * @returns Mapped error type
 */
export function mapScannerError(error: { name?: string; message?: string }): ErrorType {
  if (error.name === 'NotAllowedError') {
    return 'CAMERA_PERMISSION_DENIED';
  }
  if (error.name === 'NotFoundError') {
    return 'CAMERA_NOT_AVAILABLE';
  }
  if (error.name === 'NotSupportedError') {
    return 'CAMERA_NOT_SUPPORTED';
  }
  return 'SCAN_FAILED';
}

/**
 * Checks if an error is recoverable (user can retry)
 *
 * @param type - The error type
 * @returns True if the error is recoverable
 */
export function isRecoverableError(type: ErrorType): boolean {
  const nonRecoverable: ErrorType[] = [
    'CAMERA_NOT_SUPPORTED',
    'SHAREPOINT_LIST_NOT_FOUND',
    'SHAREPOINT_PERMISSION',
  ];
  return !nonRecoverable.includes(type);
}
