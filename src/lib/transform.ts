/**
 * Data Transformation Library
 *
 * Transforms form data into SharePoint list item format.
 * Handles date formatting, user mapping, and field preparation.
 *
 * Requirements: FR-06 through FR-10, FR-17 through FR-21
 */

import { sanitizeBarcodeValue, sanitizeInput } from './sanitization';

/**
 * Form data as captured from the app
 */
export interface ScanFormData {
  barcodeValue: string;
  location?: string;
  notes?: string;
}

/**
 * User information from Microsoft 365
 */
export interface M365User {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
}

/**
 * SharePoint list item structure matching the schema
 * See: src/sharepoint/list-schema.json
 */
export interface SharePointListItem {
  Title: string;
  BarcodeValue: string;
  ScannedById: number;
  ScannedByStringId?: string;
  ScannedDate: string;
  Location?: string;
  Notes?: string;
}

/**
 * SharePoint Person field format
 */
export interface SharePointPersonField {
  Id: number;
  Title: string;
  Email: string;
}

/**
 * Formats a date as ISO 8601 string for SharePoint
 * Requirement: FR-08, FR-18
 *
 * @param date - Date to format (defaults to now)
 * @returns ISO 8601 formatted date string
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Formats a date for display in the app
 *
 * @param date - Date to format
 * @returns Human-readable date string
 */
export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Generates a title for the SharePoint list item
 * Requirement: FR-17
 *
 * @param barcodeValue - The scanned barcode
 * @param timestamp - When it was scanned
 * @returns Generated title
 */
export function generateItemTitle(barcodeValue: string, timestamp: Date = new Date()): string {
  const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  const shortBarcode = barcodeValue.length > 20
    ? barcodeValue.substring(0, 20) + '...'
    : barcodeValue;
  return `Scan: ${shortBarcode} (${dateStr})`;
}

/**
 * Maps M365 user to SharePoint Person field ID
 * Requirement: FR-09, FR-19
 *
 * Note: In Power Apps, this is handled automatically by the connector.
 * This function is for Azure Functions or custom implementations.
 *
 * @param user - M365 user object
 * @returns SharePoint user ID (placeholder - actual mapping done by SharePoint)
 */
export function mapUserToSharePointId(user: M365User): number {
  // In actual SharePoint integration, the user ID is resolved by the connector
  // This returns -1 to indicate it should be auto-resolved
  // The actual implementation uses User().Email in Power Fx
  return -1;
}

/**
 * Transforms form data to SharePoint list item format
 * Requirements: FR-06 through FR-10, FR-17 through FR-21
 *
 * @param formData - Data from the scan form
 * @param user - Current M365 user
 * @param timestamp - When the scan occurred (defaults to now)
 * @returns SharePoint list item ready for submission
 */
export function transformToSharePointItem(
  formData: ScanFormData,
  user: M365User,
  timestamp: Date = new Date()
): SharePointListItem {
  const sanitizedBarcode = sanitizeBarcodeValue(formData.barcodeValue);

  const item: SharePointListItem = {
    Title: generateItemTitle(sanitizedBarcode, timestamp),
    BarcodeValue: sanitizedBarcode,
    ScannedById: mapUserToSharePointId(user),
    ScannedByStringId: user.email, // Fallback for lookup
    ScannedDate: formatTimestamp(timestamp),
  };

  // Add optional fields if provided
  if (formData.location && formData.location.trim()) {
    item.Location = sanitizeInput(formData.location.trim());
  }

  if (formData.notes && formData.notes.trim()) {
    item.Notes = sanitizeInput(formData.notes.trim());
  }

  return item;
}

/**
 * Creates a session history entry for display in the app
 * Requirement: FR-14
 *
 * @param formData - The submitted form data
 * @param timestamp - When submitted
 * @returns History entry for session display
 */
export function createSessionHistoryEntry(
  formData: ScanFormData,
  timestamp: Date = new Date()
): {
  id: string;
  barcodeValue: string;
  timestamp: string;
  displayTime: string;
  location?: string;
} {
  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    barcodeValue: formData.barcodeValue,
    timestamp: formatTimestamp(timestamp),
    displayTime: formatDisplayDate(timestamp),
    location: formData.location,
  };
}

/**
 * Validates that a SharePoint item has all required fields
 * Requirement: Section 4.1 Data Model
 *
 * @param item - SharePoint item to validate
 * @returns Validation result
 */
export function validateSharePointItem(item: Partial<SharePointListItem>): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = ['BarcodeValue', 'ScannedDate'] as const;
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!item[field]) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
