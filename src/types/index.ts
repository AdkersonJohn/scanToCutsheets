export type ScanStatus = 'pending' | 'submitted' | 'failed';

export interface ScanRecord {
  id: string;
  assetTag: string;
  scannedAt: Date;
  status: ScanStatus;
  errorMessage?: string;
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
