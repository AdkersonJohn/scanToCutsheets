export type ScanStatus = 'pending' | 'submitted' | 'failed';

export type ScanMode = 'assetTag' | 'serialNumber';

export interface ScanRecord {
  id: string;
  assetTag: string;
  serialNumber: string;
  scannedAt: Date;
  status: ScanStatus;
  errorMessage?: string;
}

// Validation patterns
export const ASSET_TAG_PATTERN = /^EW\d{2}-\d{5}$/;
export const SERIAL_NUMBER_PATTERN = /^[A-Z0-9]{7}$/i;

export function validateAssetTag(value: string): boolean {
  return ASSET_TAG_PATTERN.test(value);
}

export function validateSerialNumber(value: string): boolean {
  return SERIAL_NUMBER_PATTERN.test(value);
}

export function formatAssetTag(value: string): string {
  // Auto-format: add hyphen if missing (EW12 12345 -> EW12-12345)
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length === 9 && cleaned.startsWith('EW')) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return value.toUpperCase();
}

export interface ScanningSession {
  id: string;
  userId: string;
  userName: string;
  startedAt: Date;
  endedAt: Date | null;
  records: ScanRecord[];
}

export type AppScreen = 'home' | 'scanning' | 'review' | 'submission';

export interface SubmissionResult {
  recordId: string;
  success: boolean;
  error?: string;
}
