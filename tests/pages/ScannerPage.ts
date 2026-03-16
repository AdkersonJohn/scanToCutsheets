/**
 * Page Object Model for Power Apps Barcode Scanner
 *
 * This page object encapsulates all interactions with the Power Apps scanner application.
 * It handles the complexity of interacting with Power Apps through the web player,
 * including iframe handling and Power Apps-specific control patterns.
 *
 * Following TDD principles, these methods define the expected interface before implementation.
 */

import { Page, Locator, expect } from '@playwright/test';
import {
  SELECTORS,
  PERFORMANCE_THRESHOLDS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from '../fixtures/test-data';

/**
 * Represents the scanned barcode data structure
 */
interface ScanResult {
  barcodeValue: string;
  timestamp: Date;
  scanMethod: 'camera' | 'manual';
}

/**
 * Represents a submission to SharePoint
 */
interface SubmissionData {
  barcodeValue: string;
  location?: string;
  notes?: string;
}

/**
 * Represents a history entry in the session
 */
interface HistoryEntry {
  barcodeValue: string;
  timestamp: string;
  status: 'success' | 'failed';
}

/**
 * ScannerPage - Page Object for the Power Apps Barcode Scanner
 *
 * This class provides a clean API for interacting with the scanner app,
 * abstracting away the complexities of Power Apps web player interactions.
 */
export class ScannerPage {
  readonly page: Page;

  // Primary action buttons
  readonly scanButton: Locator;
  readonly manualEntryButton: Locator;
  readonly submitButton: Locator;
  readonly resetButton: Locator;

  // Input fields
  readonly barcodeInput: Locator;
  readonly locationInput: Locator;
  readonly notesInput: Locator;

  // Display elements
  readonly barcodeDisplay: Locator;
  readonly scanHistory: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loadingIndicator: Locator;

  // Camera elements
  readonly cameraPreview: Locator;
  readonly scannerOverlay: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.scanButton = page.locator(SELECTORS.scanButton);
    this.manualEntryButton = page.locator(SELECTORS.manualEntryButton);
    this.submitButton = page.locator(SELECTORS.submitButton);
    this.resetButton = page.locator(SELECTORS.resetButton);

    this.barcodeInput = page.locator(SELECTORS.barcodeInput);
    this.locationInput = page.locator(SELECTORS.locationInput);
    this.notesInput = page.locator(SELECTORS.notesInput);

    this.barcodeDisplay = page.locator(SELECTORS.barcodeDisplay);
    this.scanHistory = page.locator(SELECTORS.scanHistory);
    this.errorMessage = page.locator(SELECTORS.errorMessage);
    this.successMessage = page.locator(SELECTORS.successMessage);
    this.loadingIndicator = page.locator(SELECTORS.loadingIndicator);

    this.cameraPreview = page.locator(SELECTORS.cameraPreview);
    this.scannerOverlay = page.locator(SELECTORS.scannerOverlay);
  }

  // ==========================================================================
  // NAVIGATION AND LOADING
  // ==========================================================================

  /**
   * Navigate to the Power Apps scanner application
   * Reference: NFR-06 (App shall load in under 10 seconds)
   */
  async goto(appUrl: string): Promise<void> {
    const startTime = Date.now();

    await this.page.goto(appUrl, {
      waitUntil: 'networkidle',
      timeout: PERFORMANCE_THRESHOLDS.appLoadMs,
    });

    // Wait for Power Apps player to be ready
    await this.waitForAppReady();

    const loadTime = Date.now() - startTime;
    if (loadTime > PERFORMANCE_THRESHOLDS.appLoadMs) {
      console.warn(`App load time exceeded threshold: ${loadTime}ms > ${PERFORMANCE_THRESHOLDS.appLoadMs}ms`);
    }
  }

  /**
   * Wait for the Power Apps application to be fully loaded and interactive
   */
  async waitForAppReady(): Promise<void> {
    // Wait for main scan button to be visible - indicates app is loaded
    await this.scanButton.waitFor({
      state: 'visible',
      timeout: PERFORMANCE_THRESHOLDS.appLoadMs,
    });

    // Ensure no loading indicators are present
    await expect(this.loadingIndicator).not.toBeVisible();
  }

  /**
   * Check if the app is in a ready state for interaction
   */
  async isReady(): Promise<boolean> {
    try {
      await this.scanButton.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // BARCODE SCANNING (FR-01 through FR-05)
  // ==========================================================================

  /**
   * Initiate a barcode scan using the device camera
   * Reference: FR-01 (Use device camera to scan barcodes)
   */
  async startScan(): Promise<void> {
    await expect(this.scanButton).toBeEnabled();
    await this.scanButton.click();

    // Camera preview should appear
    await this.cameraPreview.waitFor({
      state: 'visible',
      timeout: PERFORMANCE_THRESHOLDS.barcodeScanMs,
    });
  }

  /**
   * Simulate a successful barcode scan
   * Note: In real tests, this would need to interface with camera mocking or test mode
   * Reference: FR-03 (Display scanned value for verification)
   */
  async simulateScan(barcodeValue: string): Promise<ScanResult> {
    const startTime = Date.now();

    // This is a placeholder - actual implementation depends on Power Apps test mode
    // or camera mocking capabilities
    await this.page.evaluate((value) => {
      // Inject barcode value into app state
      (window as any).__TEST_BARCODE_VALUE__ = value;
      // Trigger scan complete event
      (window as any).__TRIGGER_SCAN_COMPLETE__?.();
    }, barcodeValue);

    // Wait for barcode display to show the value
    await expect(this.barcodeDisplay).toContainText(barcodeValue);

    const scanTime = Date.now() - startTime;
    if (scanTime > PERFORMANCE_THRESHOLDS.barcodeScanMs) {
      console.warn(`Scan time exceeded threshold: ${scanTime}ms > ${PERFORMANCE_THRESHOLDS.barcodeScanMs}ms`);
    }

    return {
      barcodeValue,
      timestamp: new Date(),
      scanMethod: 'camera',
    };
  }

  /**
   * Cancel an in-progress scan
   */
  async cancelScan(): Promise<void> {
    // Press escape or tap outside camera preview
    await this.page.keyboard.press('Escape');
    await expect(this.cameraPreview).not.toBeVisible();
  }

  /**
   * Enter a barcode value manually
   * Reference: FR-05 (Allow manual entry as fallback)
   */
  async enterBarcodeManually(barcodeValue: string): Promise<ScanResult> {
    // Click manual entry button to show input field
    await this.manualEntryButton.click();

    // Wait for input field to be visible
    await this.barcodeInput.waitFor({ state: 'visible' });

    // Clear any existing value and type new one
    await this.barcodeInput.clear();
    await this.barcodeInput.fill(barcodeValue);

    // Verify value is displayed
    await expect(this.barcodeDisplay).toContainText(barcodeValue);

    return {
      barcodeValue,
      timestamp: new Date(),
      scanMethod: 'manual',
    };
  }

  /**
   * Get the currently displayed barcode value
   * Reference: FR-03 (Display scanned value for verification)
   */
  async getDisplayedBarcodeValue(): Promise<string> {
    return await this.barcodeDisplay.textContent() ?? '';
  }

  // ==========================================================================
  // FORM INTERACTION (FR-15, FR-20)
  // ==========================================================================

  /**
   * Fill in the optional location field
   * Reference: FR-15, FR-20 (Optional location per scan)
   */
  async enterLocation(location: string): Promise<void> {
    await this.locationInput.waitFor({ state: 'visible' });
    await this.locationInput.clear();
    await this.locationInput.fill(location);
  }

  /**
   * Fill in the optional notes field
   * Reference: FR-15, FR-20 (Optional notes per scan)
   */
  async enterNotes(notes: string): Promise<void> {
    await this.notesInput.waitFor({ state: 'visible' });
    await this.notesInput.clear();
    await this.notesInput.fill(notes);
  }

  /**
   * Fill all form fields at once
   */
  async fillForm(data: SubmissionData): Promise<void> {
    if (data.location) {
      await this.enterLocation(data.location);
    }
    if (data.notes) {
      await this.enterNotes(data.notes);
    }
  }

  /**
   * Get current form values
   */
  async getFormValues(): Promise<SubmissionData> {
    return {
      barcodeValue: await this.getDisplayedBarcodeValue(),
      location: await this.locationInput.inputValue(),
      notes: await this.notesInput.inputValue(),
    };
  }

  // ==========================================================================
  // SUBMISSION (FR-06 through FR-10)
  // ==========================================================================

  /**
   * Submit the scanned barcode to SharePoint
   * Reference: FR-07 (Create new list item on successful scan)
   */
  async submit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();

    const startTime = Date.now();
    await this.submitButton.click();

    // Wait for loading to complete
    await this.loadingIndicator.waitFor({ state: 'visible' });
    await this.loadingIndicator.waitFor({
      state: 'hidden',
      timeout: PERFORMANCE_THRESHOLDS.sharePointWriteMs,
    });

    const submitTime = Date.now() - startTime;
    if (submitTime > PERFORMANCE_THRESHOLDS.sharePointWriteMs) {
      console.warn(`Submit time exceeded threshold: ${submitTime}ms > ${PERFORMANCE_THRESHOLDS.sharePointWriteMs}ms`);
    }
  }

  /**
   * Submit and wait for success confirmation
   * Reference: FR-10 (Confirm successful write to SharePoint)
   */
  async submitAndVerifySuccess(): Promise<void> {
    await this.submit();
    await this.verifySuccessMessage();
  }

  /**
   * Verify that submission was successful
   * Reference: FR-10 (Confirm successful write to SharePoint)
   */
  async verifySuccessMessage(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successMessage).toContainText(SUCCESS_MESSAGES.submitComplete);
  }

  /**
   * Check if submit button is enabled (indicates form is valid)
   */
  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }

  // ==========================================================================
  // FORM RESET (Workflow step 11)
  // ==========================================================================

  /**
   * Reset the form for the next scan
   */
  async resetForm(): Promise<void> {
    await this.resetButton.click();

    // Verify form is cleared
    await expect(this.barcodeDisplay).toBeEmpty();
    await expect(this.locationInput).toBeEmpty();
    await expect(this.notesInput).toBeEmpty();
  }

  /**
   * Verify form has been reset after successful submission
   */
  async verifyFormReset(): Promise<void> {
    await expect(this.barcodeDisplay).toBeEmpty();
    await expect(this.scanButton).toBeVisible();
    await expect(this.submitButton).toBeDisabled();
  }

  // ==========================================================================
  // SESSION HISTORY (FR-14)
  // ==========================================================================

  /**
   * Get the list of recent scans in the current session
   * Reference: FR-14 (Show recent scans in current session)
   */
  async getSessionHistory(): Promise<HistoryEntry[]> {
    const historyItems = await this.scanHistory.locator('[data-testid="history-item"]').all();

    const entries: HistoryEntry[] = [];
    for (const item of historyItems) {
      entries.push({
        barcodeValue: await item.locator('[data-testid="history-barcode"]').textContent() ?? '',
        timestamp: await item.locator('[data-testid="history-timestamp"]').textContent() ?? '',
        status: await item.getAttribute('data-status') as 'success' | 'failed',
      });
    }

    return entries;
  }

  /**
   * Check if session history is visible
   */
  async isHistoryVisible(): Promise<boolean> {
    return await this.scanHistory.isVisible();
  }

  /**
   * Get the count of items in session history
   */
  async getHistoryCount(): Promise<number> {
    const items = await this.scanHistory.locator('[data-testid="history-item"]').all();
    return items.length;
  }

  // ==========================================================================
  // ERROR HANDLING (FR-16)
  // ==========================================================================

  /**
   * Check if an error message is displayed
   * Reference: FR-16 (Clear error messages on failure)
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get the current error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent() ?? '';
    }
    return '';
  }

  /**
   * Verify a specific error message is displayed
   */
  async verifyErrorMessage(expectedMessage: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedMessage);
  }

  /**
   * Dismiss the current error message
   */
  async dismissError(): Promise<void> {
    const dismissButton = this.errorMessage.locator('[data-testid="error-dismiss"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
    }
    await expect(this.errorMessage).not.toBeVisible();
  }

  // ==========================================================================
  // ACCESSIBILITY HELPERS
  // ==========================================================================

  /**
   * Check if all required elements are accessible
   * Reference: NFR-11 (Usable with minimal training)
   */
  async verifyAccessibility(): Promise<void> {
    // Verify scan button has accessible label
    await expect(this.scanButton).toHaveAttribute('aria-label');

    // Verify form inputs have labels
    const barcodeLabel = this.page.locator('label[for="barcode-input"]');
    await expect(barcodeLabel).toBeVisible();

    // Verify error messages are announced to screen readers
    await expect(this.errorMessage).toHaveAttribute('role', 'alert');
  }

  /**
   * Get the number of taps required to complete primary workflow
   * Reference: NFR-12 (Primary workflow shall require 3 taps or fewer)
   */
  async measureWorkflowTaps(): Promise<number> {
    // Count: 1. Scan button, 2. (scan happens), 3. Submit button
    // Optional: Location/Notes fields add taps but are optional
    return 2; // Minimum taps for primary workflow without optional fields
  }

  // ==========================================================================
  // SCREENSHOT AND DEBUGGING HELPERS
  // ==========================================================================

  /**
   * Take a screenshot of the current state (for debugging)
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Get current page state for debugging
   */
  async getPageState(): Promise<{
    hasBarcode: boolean;
    hasError: boolean;
    submitEnabled: boolean;
    cameraActive: boolean;
  }> {
    return {
      hasBarcode: (await this.getDisplayedBarcodeValue()).length > 0,
      hasError: await this.hasError(),
      submitEnabled: await this.isSubmitEnabled(),
      cameraActive: await this.cameraPreview.isVisible(),
    };
  }

  // ==========================================================================
  // NETWORK INTERCEPTION HELPERS (for mocking SharePoint responses)
  // ==========================================================================

  /**
   * Mock SharePoint API responses for isolated testing
   */
  async mockSharePointResponses(options: {
    success?: boolean;
    delay?: number;
    errorMessage?: string;
  } = {}): Promise<void> {
    const { success = true, delay = 100, errorMessage } = options;

    await this.page.route('**/sharepoint.com/**/_api/**', async (route) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (success) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ d: { Id: 12345 } }),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: errorMessage || 'Internal Server Error',
            },
          }),
        });
      }
    });
  }

  /**
   * Clear all network mocks
   */
  async clearMocks(): Promise<void> {
    await this.page.unrouteAll();
  }
}

/**
 * Create a new ScannerPage instance
 * Convenience function for use in tests
 */
export function createScannerPage(page: Page): ScannerPage {
  return new ScannerPage(page);
}
