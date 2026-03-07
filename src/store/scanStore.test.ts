import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScanStore } from './scanStore';

// Reset store before each test
beforeEach(() => {
  useScanStore.getState().reset();
  vi.clearAllMocks();
});

describe('ScanStore', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useScanStore.getState();

      expect(state.currentScreen).toBe('home');
      expect(state.session).toBeNull();
      expect(state.isScanning).toBe(false);
      expect(state.submissionResults).toEqual([]);
      expect(state.isSubmitting).toBe(false);
      expect(state.submissionProgress).toBe(0);
      expect(state.scanMode).toBe('assetTag');
      expect(state.pendingAssetTag).toBeNull();
    });
  });

  describe('setScreen', () => {
    it('should update the current screen', () => {
      useScanStore.getState().setScreen('scanning');
      expect(useScanStore.getState().currentScreen).toBe('scanning');

      useScanStore.getState().setScreen('review');
      expect(useScanStore.getState().currentScreen).toBe('review');

      useScanStore.getState().setScreen('submission');
      expect(useScanStore.getState().currentScreen).toBe('submission');

      useScanStore.getState().setScreen('home');
      expect(useScanStore.getState().currentScreen).toBe('home');
    });
  });

  describe('startSession', () => {
    it('should create a new session with user info', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');

      const state = useScanStore.getState();
      expect(state.session).not.toBeNull();
      expect(state.session?.userId).toBe('user-123');
      expect(state.session?.userName).toBe('John Doe');
      expect(state.session?.records).toEqual([]);
      expect(state.session?.endedAt).toBeNull();
      expect(state.session?.startedAt).toBeInstanceOf(Date);
    });

    it('should switch to scanning screen', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      expect(useScanStore.getState().currentScreen).toBe('scanning');
    });

    it('should set isScanning to true', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      expect(useScanStore.getState().isScanning).toBe(true);
    });

    it('should reset scan mode to assetTag', () => {
      useScanStore.getState().setScanMode('serialNumber');
      useScanStore.getState().startSession('user-123', 'John Doe');
      expect(useScanStore.getState().scanMode).toBe('assetTag');
    });

    it('should clear pending asset tag', () => {
      // First start a session and set a pending asset tag
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      expect(useScanStore.getState().pendingAssetTag).toBe('EW26-03975');

      // Start a new session should clear it
      useScanStore.getState().startSession('user-456', 'Jane Doe');
      expect(useScanStore.getState().pendingAssetTag).toBeNull();
    });
  });

  describe('endSession', () => {
    it('should set endedAt timestamp', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().endSession();

      const state = useScanStore.getState();
      expect(state.session?.endedAt).toBeInstanceOf(Date);
    });

    it('should switch to review screen', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().endSession();
      expect(useScanStore.getState().currentScreen).toBe('review');
    });

    it('should set isScanning to false', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().endSession();
      expect(useScanStore.getState().isScanning).toBe(false);
    });

    it('should reset scan mode and pending asset tag', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().endSession();

      expect(useScanStore.getState().scanMode).toBe('assetTag');
      expect(useScanStore.getState().pendingAssetTag).toBeNull();
    });

    it('should do nothing when no session exists', () => {
      useScanStore.getState().endSession();
      expect(useScanStore.getState().session).toBeNull();
    });
  });

  describe('addScan - Asset Tag Mode', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
    });

    it('should accept valid asset tag and switch to serial number mode', () => {
      const result = useScanStore.getState().addScan('EW26-03975');

      expect(result.success).toBe(true);
      expect(useScanStore.getState().pendingAssetTag).toBe('EW26-03975');
      expect(useScanStore.getState().scanMode).toBe('serialNumber');
    });

    it('should auto-format asset tag without hyphen', () => {
      const result = useScanStore.getState().addScan('EW2603975');

      expect(result.success).toBe(true);
      expect(useScanStore.getState().pendingAssetTag).toBe('EW26-03975');
    });

    it('should reject invalid asset tag format', () => {
      const result = useScanStore.getState().addScan('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Asset Tag format');
      expect(useScanStore.getState().pendingAssetTag).toBeNull();
      expect(useScanStore.getState().scanMode).toBe('assetTag');
    });

    it('should reject duplicate asset tag', () => {
      // First scan - complete a full pair
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');

      // Try to scan the same asset tag again
      const result = useScanStore.getState().addScan('EW26-03975');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already scanned');
    });

    it('should reject when no active session', () => {
      useScanStore.getState().reset();
      const result = useScanStore.getState().addScan('EW26-03975');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active session');
    });
  });

  describe('addScan - Serial Number Mode', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975'); // Set pending asset tag
    });

    it('should create record when valid serial number is scanned', () => {
      const result = useScanStore.getState().addScan('ABC1234');

      expect(result.success).toBe(true);
      const state = useScanStore.getState();
      expect(state.session?.records.length).toBe(1);
      expect(state.session?.records[0].assetTag).toBe('EW26-03975');
      expect(state.session?.records[0].serialNumber).toBe('ABC1234');
      expect(state.session?.records[0].status).toBe('pending');
    });

    it('should switch back to asset tag mode after successful scan', () => {
      useScanStore.getState().addScan('ABC1234');

      expect(useScanStore.getState().scanMode).toBe('assetTag');
      expect(useScanStore.getState().pendingAssetTag).toBeNull();
    });

    it('should uppercase serial number', () => {
      useScanStore.getState().addScan('abc1234');

      expect(useScanStore.getState().session?.records[0].serialNumber).toBe('ABC1234');
    });

    it('should reject invalid serial number format', () => {
      const result = useScanStore.getState().addScan('INVALID123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Serial Number format');
      expect(useScanStore.getState().session?.records.length).toBe(0);
    });

    it('should reject duplicate serial number', () => {
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().addScan('EW26-04000');

      const result = useScanStore.getState().addScan('ABC1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already scanned');
    });

    it('should fail when no pending asset tag exists', () => {
      useScanStore.getState().cancelPendingAssetTag();
      useScanStore.getState().setScanMode('serialNumber');

      const result = useScanStore.getState().addScan('ABC1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No Asset Tag pending');
    });
  });

  describe('updateScan', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
    });

    it('should update asset tag', () => {
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().updateScan(recordId, 'assetTag', 'EW27-00001');

      expect(useScanStore.getState().session?.records[0].assetTag).toBe('EW27-00001');
    });

    it('should update serial number', () => {
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().updateScan(recordId, 'serialNumber', 'XYZ9999');

      expect(useScanStore.getState().session?.records[0].serialNumber).toBe('XYZ9999');
    });

    it('should not affect other records', () => {
      useScanStore.getState().addScan('EW26-04000');
      useScanStore.getState().addScan('DEF5678');

      const firstRecordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().updateScan(firstRecordId, 'assetTag', 'EW27-00001');

      expect(useScanStore.getState().session?.records[1].assetTag).toBe('EW26-04000');
    });

    it('should do nothing when session is null', () => {
      useScanStore.getState().reset();
      useScanStore.getState().updateScan('fake-id', 'assetTag', 'EW27-00001');
      // Should not throw
      expect(useScanStore.getState().session).toBeNull();
    });
  });

  describe('removeScan', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().addScan('EW26-04000');
      useScanStore.getState().addScan('DEF5678');
    });

    it('should remove the specified record', () => {
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().removeScan(recordId);

      expect(useScanStore.getState().session?.records.length).toBe(1);
      expect(useScanStore.getState().session?.records[0].assetTag).toBe('EW26-04000');
    });

    it('should not affect other records', () => {
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().removeScan(recordId);

      expect(useScanStore.getState().session?.records[0].serialNumber).toBe('DEF5678');
    });

    it('should do nothing when session is null', () => {
      useScanStore.getState().reset();
      useScanStore.getState().removeScan('fake-id');
      // Should not throw
      expect(useScanStore.getState().session).toBeNull();
    });

    it('should do nothing when record ID does not exist', () => {
      useScanStore.getState().removeScan('nonexistent-id');
      expect(useScanStore.getState().session?.records.length).toBe(2);
    });
  });

  describe('addManualEntry', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
    });

    it('should add a new record with formatted values', () => {
      useScanStore.getState().addManualEntry('ew26-03975', 'abc1234');

      const record = useScanStore.getState().session?.records[0];
      expect(record?.assetTag).toBe('EW26-03975');
      expect(record?.serialNumber).toBe('ABC1234');
      expect(record?.status).toBe('pending');
    });

    it('should auto-format asset tag', () => {
      useScanStore.getState().addManualEntry('EW2603975', 'ABC1234');

      expect(useScanStore.getState().session?.records[0].assetTag).toBe('EW26-03975');
    });

    it('should do nothing when session is null', () => {
      useScanStore.getState().reset();
      useScanStore.getState().addManualEntry('EW26-03975', 'ABC1234');

      expect(useScanStore.getState().session).toBeNull();
    });
  });

  describe('cancelPendingAssetTag', () => {
    it('should clear pending asset tag and reset scan mode', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');

      expect(useScanStore.getState().pendingAssetTag).toBe('EW26-03975');
      expect(useScanStore.getState().scanMode).toBe('serialNumber');

      useScanStore.getState().cancelPendingAssetTag();

      expect(useScanStore.getState().pendingAssetTag).toBeNull();
      expect(useScanStore.getState().scanMode).toBe('assetTag');
    });
  });

  describe('setScanMode', () => {
    it('should update scan mode', () => {
      useScanStore.getState().setScanMode('serialNumber');
      expect(useScanStore.getState().scanMode).toBe('serialNumber');

      useScanStore.getState().setScanMode('assetTag');
      expect(useScanStore.getState().scanMode).toBe('assetTag');
    });
  });

  describe('setIsScanning', () => {
    it('should update isScanning state', () => {
      useScanStore.getState().setIsScanning(true);
      expect(useScanStore.getState().isScanning).toBe(true);

      useScanStore.getState().setIsScanning(false);
      expect(useScanStore.getState().isScanning).toBe(false);
    });
  });

  describe('Submission State Management', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
    });

    describe('setSubmitting', () => {
      it('should update isSubmitting state', () => {
        useScanStore.getState().setSubmitting(true);
        expect(useScanStore.getState().isSubmitting).toBe(true);

        useScanStore.getState().setSubmitting(false);
        expect(useScanStore.getState().isSubmitting).toBe(false);
      });
    });

    describe('setSubmissionProgress', () => {
      it('should update submission progress', () => {
        useScanStore.getState().setSubmissionProgress(50);
        expect(useScanStore.getState().submissionProgress).toBe(50);

        useScanStore.getState().setSubmissionProgress(100);
        expect(useScanStore.getState().submissionProgress).toBe(100);
      });
    });

    describe('addSubmissionResult', () => {
      it('should add a submission result', () => {
        useScanStore.getState().addSubmissionResult({
          recordId: 'test-id',
          success: true,
        });

        expect(useScanStore.getState().submissionResults.length).toBe(1);
        expect(useScanStore.getState().submissionResults[0].success).toBe(true);
      });

      it('should accumulate submission results', () => {
        useScanStore.getState().addSubmissionResult({ recordId: 'id-1', success: true });
        useScanStore.getState().addSubmissionResult({ recordId: 'id-2', success: false, error: 'Failed' });

        expect(useScanStore.getState().submissionResults.length).toBe(2);
      });
    });

    describe('markRecordSubmitted', () => {
      it('should update record status to submitted', () => {
        const recordId = useScanStore.getState().session!.records[0].id;
        useScanStore.getState().markRecordSubmitted(recordId);

        expect(useScanStore.getState().session?.records[0].status).toBe('submitted');
      });
    });

    describe('markRecordFailed', () => {
      it('should update record status to failed with error message', () => {
        const recordId = useScanStore.getState().session!.records[0].id;
        useScanStore.getState().markRecordFailed(recordId, 'Network error');

        const record = useScanStore.getState().session?.records[0];
        expect(record?.status).toBe('failed');
        expect(record?.errorMessage).toBe('Network error');
      });
    });
  });

  describe('clearSession', () => {
    it('should reset session-related state', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().setSubmissionProgress(50);
      useScanStore.getState().addSubmissionResult({ recordId: 'test', success: true });

      useScanStore.getState().clearSession();

      const state = useScanStore.getState();
      expect(state.session).toBeNull();
      expect(state.submissionResults).toEqual([]);
      expect(state.submissionProgress).toBe(0);
      expect(state.currentScreen).toBe('home');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useScanStore.getState().startSession('user-123', 'John Doe');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().setSubmitting(true);
      useScanStore.getState().setSubmissionProgress(75);

      useScanStore.getState().reset();

      const state = useScanStore.getState();
      expect(state.currentScreen).toBe('home');
      expect(state.session).toBeNull();
      expect(state.isScanning).toBe(false);
      expect(state.submissionResults).toEqual([]);
      expect(state.isSubmitting).toBe(false);
      expect(state.submissionProgress).toBe(0);
      expect(state.scanMode).toBe('assetTag');
      expect(state.pendingAssetTag).toBeNull();
    });
  });

  describe('Complete Scanning Workflow', () => {
    it('should complete a full scan session workflow', () => {
      // Start session
      useScanStore.getState().startSession('user-123', 'John Doe');
      expect(useScanStore.getState().currentScreen).toBe('scanning');

      // Scan first pair
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');

      // Scan second pair
      useScanStore.getState().addScan('EW26-04000');
      useScanStore.getState().addScan('DEF5678');

      expect(useScanStore.getState().session?.records.length).toBe(2);

      // End session
      useScanStore.getState().endSession();
      expect(useScanStore.getState().currentScreen).toBe('review');

      // Edit a record
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().updateScan(recordId, 'serialNumber', 'XYZ9999');
      expect(useScanStore.getState().session?.records[0].serialNumber).toBe('XYZ9999');

      // Delete a record
      const secondRecordId = useScanStore.getState().session!.records[1].id;
      useScanStore.getState().removeScan(secondRecordId);
      expect(useScanStore.getState().session?.records.length).toBe(1);

      // Navigate to submission
      useScanStore.getState().setScreen('submission');
      useScanStore.getState().setSubmitting(true);

      // Mark as submitted
      useScanStore.getState().markRecordSubmitted(recordId);
      useScanStore.getState().setSubmissionProgress(100);
      useScanStore.getState().setSubmitting(false);

      expect(useScanStore.getState().session?.records[0].status).toBe('submitted');

      // Clear session
      useScanStore.getState().clearSession();
      expect(useScanStore.getState().currentScreen).toBe('home');
      expect(useScanStore.getState().session).toBeNull();
    });
  });
});
