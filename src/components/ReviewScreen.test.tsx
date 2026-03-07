import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { ReviewScreen } from './ReviewScreen';
import { useScanStore } from '@/store/scanStore';

describe('ReviewScreen', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    useScanStore.getState().reset();
  });

  describe('Empty State', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().endSession();
    });

    it('should show empty state when no items are scanned', () => {
      render(<ReviewScreen />);

      expect(screen.getByText(/No items scanned/i)).toBeInTheDocument();
    });

    it('should show helpful message to scan more or add manually', () => {
      render(<ReviewScreen />);

      expect(screen.getByText(/Tap "Scan More" to scan barcodes/i)).toBeInTheDocument();
    });

    it('should show Add Manual Entry button', () => {
      render(<ReviewScreen />);

      expect(screen.getByText(/Add Manual Entry/i)).toBeInTheDocument();
    });

    it('should disable Submit button when no records exist', () => {
      render(<ReviewScreen />);

      const submitButton = screen.getByText(/Submit/i);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('With Records', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().addScan('EW26-04000');
      useScanStore.getState().addScan('DEF5678');
      useScanStore.getState().endSession();
    });

    it('should display the Review header', () => {
      render(<ReviewScreen />);

      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should display all scanned records', () => {
      render(<ReviewScreen />);

      expect(screen.getByText('EW26-03975')).toBeInTheDocument();
      expect(screen.getByText('ABC1234')).toBeInTheDocument();
      expect(screen.getByText('EW26-04000')).toBeInTheDocument();
      expect(screen.getByText('DEF5678')).toBeInTheDocument();
    });

    it('should show Scan More button', () => {
      render(<ReviewScreen />);

      expect(screen.getByRole('button', { name: /Scan More/i })).toBeInTheDocument();
    });

    it('should show Submit button with count', () => {
      render(<ReviewScreen />);

      expect(screen.getByText(/Submit \(2\)/i)).toBeInTheDocument();
    });

    it('should enable Submit button when records exist', () => {
      render(<ReviewScreen />);

      const submitButton = screen.getByText(/Submit \(2\)/i);
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Add Manual Entry', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().endSession();
    });

    it('should open add dialog when Add Manual Entry is clicked', async () => {
      render(<ReviewScreen />);

      const addButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addButton);

      // Dialog should open with form fields
      expect(screen.getByLabelText(/Asset Tag/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Serial Number/i)).toBeInTheDocument();
    });

    it('should add new record when valid data is submitted', async () => {
      render(<ReviewScreen />);

      // Click the Add Manual Entry button to open dialog
      const addEntryButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addEntryButton);

      // Wait for dialog to open and find inputs
      const assetTagInput = await screen.findByPlaceholderText('EW##-#####');
      const serialInput = await screen.findByPlaceholderText('7 characters');

      // Use fireEvent for more reliable input in CI
      fireEvent.change(assetTagInput, { target: { value: 'EW26-03975' } });
      fireEvent.change(serialInput, { target: { value: 'ABC1234' } });

      // Wait for the Add button to be enabled
      const addBtn = await screen.findByRole('button', { name: 'Add' });
      await waitFor(() => {
        expect(addBtn).not.toBeDisabled();
      }, { timeout: 2000 });

      // Click the Add button
      await user.click(addBtn);

      // Wait for dialog to close (input should no longer be in document)
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('EW##-#####')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify record was added to store
      const session = useScanStore.getState().session;
      expect(session?.records.length).toBe(1);
      expect(session?.records[0].assetTag).toBe('EW26-03975');
      expect(session?.records[0].serialNumber).toBe('ABC1234');
    });

    it('should show error for invalid asset tag', async () => {
      render(<ReviewScreen />);

      const addButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addButton);

      const assetTagInput = await screen.findByPlaceholderText('EW##-#####');
      const serialInput = await screen.findByPlaceholderText('7 characters');

      // Use fireEvent for more reliable input in CI
      fireEvent.change(assetTagInput, { target: { value: 'INVALID' } });
      fireEvent.change(serialInput, { target: { value: 'ABC1234' } });

      // Wait for button to be enabled
      const addBtn = await screen.findByRole('button', { name: 'Add' });
      await waitFor(() => {
        expect(addBtn).not.toBeDisabled();
      }, { timeout: 2000 });

      await user.click(addBtn);

      // Wait for error message to appear
      const errorMessage = await screen.findByText(/Invalid Asset Tag format/i, {}, { timeout: 3000 });
      expect(errorMessage).toBeInTheDocument();
    });

    it('should show error for invalid serial number', async () => {
      render(<ReviewScreen />);

      const addButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addButton);

      const assetTagInput = await screen.findByPlaceholderText('EW##-#####');
      const serialInput = await screen.findByPlaceholderText('7 characters');

      // Use fireEvent for more reliable input in CI
      fireEvent.change(assetTagInput, { target: { value: 'EW26-03975' } });
      fireEvent.change(serialInput, { target: { value: 'INVALID123' } });

      // Wait for button to be enabled
      const addBtn = await screen.findByRole('button', { name: 'Add' });
      await waitFor(() => {
        expect(addBtn).not.toBeDisabled();
      }, { timeout: 2000 });

      await user.click(addBtn);

      // Wait for error message to appear
      const errorMessage = await screen.findByText(/Invalid Serial Number format/i, {}, { timeout: 3000 });
      expect(errorMessage).toBeInTheDocument();
    });

    it('should disable Add button when fields are empty', async () => {
      render(<ReviewScreen />);

      const addEntryButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addEntryButton);

      const addButton = await screen.findByRole('button', { name: 'Add' });
      expect(addButton).toBeDisabled();
    });

    it('should close dialog when Cancel is clicked', async () => {
      render(<ReviewScreen />);

      const addButton = screen.getByRole('button', { name: /Add Manual Entry/i });
      await user.click(addButton);

      const assetTagInput = await screen.findByPlaceholderText('EW##-#####');
      expect(assetTagInput).toBeInTheDocument();

      const cancelButton = await screen.findByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('EW##-#####')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Submit Confirmation', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().endSession();
    });

    it('should show confirmation dialog when Submit is clicked', async () => {
      render(<ReviewScreen />);

      const submitButton = screen.getByText(/Submit \(1\)/i);
      await user.click(submitButton);

      expect(screen.getByText('Confirm Submission')).toBeInTheDocument();
      expect(screen.getByText(/You are about to create 1 cut sheet/i)).toBeInTheDocument();
    });

    it('should navigate to submission screen when confirmed', async () => {
      render(<ReviewScreen />);

      const submitButton = screen.getByText(/Submit \(1\)/i);
      await user.click(submitButton);

      const confirmButton = screen.getByRole('button', { name: 'Submit' });
      await user.click(confirmButton);

      expect(useScanStore.getState().currentScreen).toBe('submission');
    });

    it('should close dialog when Cancel is clicked in confirmation', async () => {
      render(<ReviewScreen />);

      const submitButton = screen.getByText(/Submit \(1\)/i);
      await user.click(submitButton);

      expect(screen.getByText('Confirm Submission')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Submission')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().endSession();
    });

    it('should navigate to scanning when Scan More is clicked', async () => {
      render(<ReviewScreen />);

      // Get the Scan More button from the footer (it's a button element)
      const scanMoreButton = screen.getByRole('button', { name: /Scan More/i });
      await user.click(scanMoreButton);

      expect(useScanStore.getState().currentScreen).toBe('scanning');
      expect(useScanStore.getState().isScanning).toBe(true);
    });
  });

  describe('Store Integration', () => {
    beforeEach(() => {
      useScanStore.getState().startSession('user-123', 'Test User');
      useScanStore.getState().addScan('EW26-03975');
      useScanStore.getState().addScan('ABC1234');
      useScanStore.getState().endSession();
    });

    it('should have correct session state', () => {
      render(<ReviewScreen />);

      const session = useScanStore.getState().session;
      expect(session).not.toBeNull();
      expect(session?.records.length).toBe(1);
      expect(session?.records[0].assetTag).toBe('EW26-03975');
      expect(session?.records[0].serialNumber).toBe('ABC1234');
    });

    it('should update store when record is deleted', async () => {
      render(<ReviewScreen />);

      // Delete via store directly to test store integration
      const recordId = useScanStore.getState().session!.records[0].id;
      useScanStore.getState().removeScan(recordId);

      expect(useScanStore.getState().session?.records.length).toBe(0);
    });
  });
});
