export type ScanStatus = 'pending' | 'submitted' | 'failed';

export type ScanMode = 'assetTag' | 'serialNumber';

// App mode for three-mode expansion
export type AppMode = 'createCutSheets' | 'fieldRefreshCheck' | 'finishCutSheets';

// Eligibility status for field refresh check
export type EligibilityStatus = 'eligible' | 'not_eligible' | 'already_exists' | 'pending';

export interface ScanRecord {
  id: string;
  assetTag: string;
  serialNumber: string;
  scannedAt: Date;
  status: ScanStatus;
  errorMessage?: string;
}

// Field Refresh Record for the Field Refresh Check mode
export interface FieldRefreshRecord {
  id: string;
  assetTag: string;
  serialNumber: string;
  department: string;
  locationNotes: string;
  machineType: 'desktop' | 'laptop' | 'other';
  monitorAssetTag?: string;
  monitorSerial?: string;
  scannedAt: Date;
  status: 'pending' | 'submitted' | 'failed';
  eligibilityStatus: EligibilityStatus;
  errorMessage?: string;
}

// Field Refresh Session
export interface FieldRefreshSession {
  id: string;
  userId: string;
  userName: string;
  startedAt: Date;
  endedAt: Date | null;
  records: FieldRefreshRecord[];
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

// Extended screens for three-mode app
export type AppScreen =
  | 'home'
  | 'scanning'
  | 'review'
  | 'submission'
  | 'fieldRefreshScan'
  | 'fieldRefreshReview'
  | 'fieldRefreshSubmission';

// Year eligibility helpers for Field Refresh Check
export function extractYearFromAssetTag(assetTag: string): number | null {
  const match = assetTag.match(/^EW(\d{2})-\d{5}$/);
  if (!match) return null;
  return 2000 + parseInt(match[1], 10);
}

export interface EligibilityResult {
  eligible: boolean;
  year: number | null;
  eligibleAfterYear?: number;
}

export function isEligibleForRefresh(assetTag: string): EligibilityResult {
  const year = extractYearFromAssetTag(assetTag);
  if (!year) return { eligible: false, year: null };
  const eligible = year <= 2022;
  return { eligible, year, eligibleAfterYear: eligible ? undefined : year + 4 };
}

export interface SubmissionResult {
  recordId: string;
  success: boolean;
  error?: string;
}
