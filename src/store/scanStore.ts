import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ScanRecord, ScanningSession, AppScreen, SubmissionResult } from '@/types';

interface ScanState {
  currentScreen: AppScreen;
  session: ScanningSession | null;
  isScanning: boolean;
  submissionResults: SubmissionResult[];
  isSubmitting: boolean;
  submissionProgress: number;

  setScreen: (screen: AppScreen) => void;
  startSession: (userId: string, userName: string) => void;
  endSession: () => void;
  addScan: (assetTag: string) => void;
  updateScan: (id: string, assetTag: string) => void;
  removeScan: (id: string) => void;
  addManualEntry: (assetTag: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSubmissionProgress: (progress: number) => void;
  addSubmissionResult: (result: SubmissionResult) => void;
  markRecordSubmitted: (id: string) => void;
  markRecordFailed: (id: string, errorMessage: string) => void;
  clearSession: () => void;
  reset: () => void;
}

const initialState = {
  currentScreen: 'home' as AppScreen,
  session: null,
  isScanning: false,
  submissionResults: [],
  isSubmitting: false,
  submissionProgress: 0,
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
        set({ session, currentScreen: 'scanning', isScanning: true });
      },

      endSession: () => {
        const { session } = get();
        if (session) {
          set({
            session: { ...session, endedAt: new Date() },
            isScanning: false,
            currentScreen: 'review',
          });
        }
      },

      addScan: (assetTag) => {
        const { session } = get();
        if (!session) return;

        const existingRecord = session.records.find(
          (r) => r.assetTag === assetTag
        );
        if (existingRecord) return;

        const newRecord: ScanRecord = {
          id: uuidv4(),
          assetTag,
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

      updateScan: (id, assetTag) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            records: session.records.map((r) =>
              r.id === id ? { ...r, assetTag } : r
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

      addManualEntry: (assetTag) => {
        const { session } = get();
        if (!session) return;

        const newRecord: ScanRecord = {
          id: uuidv4(),
          assetTag,
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

      reset: () => set(initialState),
    }),
    {
      name: 'scan-to-cutsheets-storage',
      partialize: (state) => ({
        session: state.session,
        currentScreen: state.currentScreen,
      }),
    }
  )
);
