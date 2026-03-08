import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScanRecord,
  ScanningSession,
  AppScreen,
  SubmissionResult,
  ScanMode,
  AppMode,
  FieldRefreshRecord,
  FieldRefreshSession,
} from '@/types';
import { validateAssetTag, validateSerialNumber, formatAssetTag } from '@/types';

interface ScanState {
  currentScreen: AppScreen;
  session: ScanningSession | null;
  isScanning: boolean;
  submissionResults: SubmissionResult[];
  isSubmitting: boolean;
  submissionProgress: number;

  // Paired scanning state
  scanMode: ScanMode;
  pendingAssetTag: string | null;

  // Mode management for three-mode app
  currentMode: AppMode | null;

  // Field Refresh session
  fieldRefreshSession: FieldRefreshSession | null;

  setScreen: (screen: AppScreen) => void;
  startSession: (userId: string, userName: string) => void;
  endSession: () => void;
  addScan: (code: string) => { success: boolean; error?: string };
  updateScan: (id: string, field: 'assetTag' | 'serialNumber', value: string) => void;
  removeScan: (id: string) => void;
  addManualEntry: (assetTag: string, serialNumber: string) => void;
  cancelPendingAssetTag: () => void;
  setScanMode: (mode: ScanMode) => void;
  setIsScanning: (scanning: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmissionProgress: (progress: number) => void;
  addSubmissionResult: (result: SubmissionResult) => void;
  markRecordSubmitted: (id: string) => void;
  markRecordFailed: (id: string, errorMessage: string) => void;
  clearSession: () => void;
  reset: () => void;

  // Mode management actions
  setMode: (mode: AppMode | null) => void;

  // Field Refresh session actions
  startFieldRefreshSession: (userId: string, userName: string) => void;
  addFieldRefreshRecord: (record: Omit<FieldRefreshRecord, 'id' | 'scannedAt'>) => void;
  updateFieldRefreshRecord: (id: string, updates: Partial<FieldRefreshRecord>) => void;
  removeFieldRefreshRecord: (id: string) => void;
  clearFieldRefreshSession: () => void;
  endFieldRefreshSession: () => void;
  markFieldRefreshRecordSubmitted: (id: string) => void;
  markFieldRefreshRecordFailed: (id: string, errorMessage: string) => void;
}

const initialState = {
  currentScreen: 'home' as AppScreen,
  session: null,
  isScanning: false,
  submissionResults: [],
  isSubmitting: false,
  submissionProgress: 0,
  scanMode: 'assetTag' as ScanMode,
  pendingAssetTag: null as string | null,
  currentMode: null as AppMode | null,
  fieldRefreshSession: null as FieldRefreshSession | null,
};

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setScreen: (screen) => set({ currentScreen: screen }),

      startSession: (userId, userName) => {
        const session: ScanningSession = {
          id: uuidv4(),
          userId,
          userName,
          startedAt: new Date(),
          endedAt: null,
          records: [],
        };
        set({
          session,
          currentScreen: 'scanning',
          isScanning: true,
          scanMode: 'assetTag',
          pendingAssetTag: null,
        });
      },

      endSession: () => {
        const { session } = get();
        if (session) {
          set({
            session: { ...session, endedAt: new Date() },
            isScanning: false,
            currentScreen: 'review',
            scanMode: 'assetTag',
            pendingAssetTag: null,
          });
        }
      },

      addScan: (code) => {
        const { session, scanMode, pendingAssetTag } = get();
        if (!session) return { success: false, error: 'No active session' };

        if (scanMode === 'assetTag') {
          // Format and validate Asset Tag
          const formattedCode = formatAssetTag(code);

          if (!validateAssetTag(formattedCode)) {
            return { success: false, error: `Invalid Asset Tag format: ${code}. Expected: EW##-#####` };
          }

          // Check for duplicate Asset Tag
          const existingRecord = session.records.find(
            (r) => r.assetTag === formattedCode
          );
          if (existingRecord) {
            return { success: false, error: `Asset Tag "${formattedCode}" already scanned` };
          }

          // Store pending Asset Tag and switch to Serial Number mode
          set({
            pendingAssetTag: formattedCode,
            scanMode: 'serialNumber'
          });
          return { success: true };
        } else {
          // Serial Number mode
          const serialNumber = code.toUpperCase();

          if (!validateSerialNumber(serialNumber)) {
            return { success: false, error: `Invalid Serial Number format: ${code}. Expected: 7 alphanumeric characters` };
          }

          // Check for duplicate Serial Number
          const existingRecord = session.records.find(
            (r) => r.serialNumber === serialNumber
          );
          if (existingRecord) {
            return { success: false, error: `Serial Number "${serialNumber}" already scanned` };
          }

          if (!pendingAssetTag) {
            return { success: false, error: 'No Asset Tag pending. Scan Asset Tag first.' };
          }

          // Create the complete scan record
          const newRecord: ScanRecord = {
            id: uuidv4(),
            assetTag: pendingAssetTag,
            serialNumber,
            scannedAt: new Date(),
            status: 'pending',
          };

          set({
            session: {
              ...session,
              records: [...session.records, newRecord],
            },
            pendingAssetTag: null,
            scanMode: 'assetTag',
          });
          return { success: true };
        }
      },

      updateScan: (id, field, value) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            records: session.records.map((r) =>
              r.id === id ? { ...r, [field]: value } : r
            ),
          },
        });
      },

      removeScan: (id) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            records: session.records.filter((r) => r.id !== id),
          },
        });
      },

      addManualEntry: (assetTag, serialNumber) => {
        const { session } = get();
        if (!session) return;

        const newRecord: ScanRecord = {
          id: uuidv4(),
          assetTag: formatAssetTag(assetTag),
          serialNumber: serialNumber.toUpperCase(),
          scannedAt: new Date(),
          status: 'pending',
        };

        set({
          session: {
            ...session,
            records: [...session.records, newRecord],
          },
        });
      },

      cancelPendingAssetTag: () => {
        set({ pendingAssetTag: null, scanMode: 'assetTag' });
      },

      setScanMode: (mode) => {
        set({ scanMode: mode });
      },

      setIsScanning: (scanning) => set({ isScanning: scanning }),

      setSubmitting: (submitting) => set({ isSubmitting: submitting }),

      setSubmissionProgress: (progress) => set({ submissionProgress: progress }),

      addSubmissionResult: (result) => {
        set((state) => ({
          submissionResults: [...state.submissionResults, result],
        }));
      },

      markRecordSubmitted: (id) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            records: session.records.map((r) =>
              r.id === id ? { ...r, status: 'submitted' } : r
            ),
          },
        });
      },

      markRecordFailed: (id, errorMessage) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            records: session.records.map((r) =>
              r.id === id ? { ...r, status: 'failed', errorMessage } : r
            ),
          },
        });
      },

      clearSession: () => {
        set({
          session: null,
          submissionResults: [],
          submissionProgress: 0,
          currentScreen: 'home',
        });
      },

      // Mode management actions
      setMode: (mode) => set({ currentMode: mode }),

      // Field Refresh session actions
      startFieldRefreshSession: (userId, userName) => {
        const session: FieldRefreshSession = {
          id: uuidv4(),
          userId,
          userName,
          startedAt: new Date(),
          endedAt: null,
          records: [],
        };
        set({
          fieldRefreshSession: session,
          currentScreen: 'fieldRefreshScan',
          currentMode: 'fieldRefreshCheck',
        });
      },

      addFieldRefreshRecord: (record) => {
        const { fieldRefreshSession } = get();
        if (!fieldRefreshSession) return;

        const newRecord: FieldRefreshRecord = {
          ...record,
          id: uuidv4(),
          scannedAt: new Date(),
        };

        set({
          fieldRefreshSession: {
            ...fieldRefreshSession,
            records: [...fieldRefreshSession.records, newRecord],
          },
        });
      },

      updateFieldRefreshRecord: (id, updates) => {
        const { fieldRefreshSession } = get();
        if (!fieldRefreshSession) return;

        set({
          fieldRefreshSession: {
            ...fieldRefreshSession,
            records: fieldRefreshSession.records.map((r) =>
              r.id === id ? { ...r, ...updates } : r
            ),
          },
        });
      },

      removeFieldRefreshRecord: (id) => {
        const { fieldRefreshSession } = get();
        if (!fieldRefreshSession) return;

        set({
          fieldRefreshSession: {
            ...fieldRefreshSession,
            records: fieldRefreshSession.records.filter((r) => r.id !== id),
          },
        });
      },

      clearFieldRefreshSession: () => {
        set({
          fieldRefreshSession: null,
          submissionResults: [],
          submissionProgress: 0,
          currentScreen: 'home',
          currentMode: null,
        });
      },

      endFieldRefreshSession: () => {
        const { fieldRefreshSession } = get();
        if (fieldRefreshSession) {
          set({
            fieldRefreshSession: { ...fieldRefreshSession, endedAt: new Date() },
            currentScreen: 'fieldRefreshReview',
          });
        }
      },

      markFieldRefreshRecordSubmitted: (id) => {
        const { fieldRefreshSession } = get();
        if (!fieldRefreshSession) return;

        set({
          fieldRefreshSession: {
            ...fieldRefreshSession,
            records: fieldRefreshSession.records.map((r) =>
              r.id === id ? { ...r, status: 'submitted' } : r
            ),
          },
        });
      },

      markFieldRefreshRecordFailed: (id, errorMessage) => {
        const { fieldRefreshSession } = get();
        if (!fieldRefreshSession) return;

        set({
          fieldRefreshSession: {
            ...fieldRefreshSession,
            records: fieldRefreshSession.records.map((r) =>
              r.id === id ? { ...r, status: 'failed', errorMessage } : r
            ),
          },
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'scan-to-cutsheets-storage',
      partialize: (state) => ({
        session: state.session,
        currentScreen: state.currentScreen,
        currentMode: state.currentMode,
        fieldRefreshSession: state.fieldRefreshSession,
      }),
    }
  )
);
