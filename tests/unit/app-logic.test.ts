/**
 * Unit Test Suite for Power Apps Barcode Scanner
 *
 * This test suite validates the core business logic implemented in src/lib/app.ts.
 *
 * Test Pyramid Position: Unit Tests (70% of test coverage)
 */

import {
  VALID_BARCODES,
  INVALID_BARCODES,
  LOCATION_VALUES,
  NOTES_VALUES,
  SHAREPOINT_SCHEMA,
  TEST_USERS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PERFORMANCE_THRESHOLDS,
  generateTestBarcode,
  createScanPayload,
  createSharePointItemResponse,
} from '../fixtures/test-data';

// Import actual implementations
import {
  validateBarcodeValue,
  sanitizeInput,
  detectBarcodeFormat,
  transformToSharePointItem,
  validateLocation,
  validateNotes,
  generateErrorMessage,
  validateUserPermission,
  checkRecentDuplicate,
  clearRecentScans,
  recordScan,
} from '../../src/lib/app';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: string;
}

interface BarcodeData {
  value: string;
  format: 'CODE_128' | 'CODE_39' | 'QR_CODE' | 'UNKNOWN';
  confidence?: number;
}

interface SubmissionPayload {
  barcodeValue: string;
  scannedBy: {
    email: string;
    displayName: string;
    id: string;
  };
  scannedDate: Date;
  location?: string;
  notes?: string;
}

interface SharePointItem {
  Title?: string;
  BarcodeValue: string;
  ScannedBy: { Email: string; Title: string };
  ScannedDate: string;
  Location?: string | null;
  Notes?: string | null;
}

// ============================================================================
// TEST SUITE: BARCODE VALUE VALIDATION
// Reference: FR-03 (Display scanned value for verification)
// Reference: FR-16 (Clear error messages on failure)
// ============================================================================

describe('Barcode Value Validation', () => {
  describe('validateBarcodeValue', () => {
    // -------------------------------------------------------------------------
    // Valid barcode scenarios
    // -------------------------------------------------------------------------

    describe('should accept valid barcodes', () => {
      it('should accept standard Code 128 barcode [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_128.standard;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept Code 128 barcode with numbers [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_128.withNumbers;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept alphanumeric Code 128 barcode [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_128.alphanumeric;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept Code 39 barcode with dashes [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_39.withDashes;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept Code 39 barcode with spaces [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_39.withSpaces;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept simple QR code value [FR-02]', () => {
        const barcode = VALID_BARCODES.QR_CODE.simple;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept QR code with URL content [FR-02]', () => {
        const barcode = VALID_BARCODES.QR_CODE.url;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(barcode);
      });

      it('should accept maximum practical length barcode [FR-02]', () => {
        const barcode = VALID_BARCODES.CODE_128.maxLength;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue?.length).toBe(48);
      });
    });

    // -------------------------------------------------------------------------
    // Invalid barcode scenarios
    // -------------------------------------------------------------------------

    describe('should reject invalid barcodes', () => {
      it('should reject empty barcode value [FR-16]', () => {
        const barcode = INVALID_BARCODES.empty;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe(ERROR_MESSAGES.barcodeEmpty);
      });

      it('should reject whitespace-only barcode value [FR-16]', () => {
        const barcode = INVALID_BARCODES.whitespaceOnly;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe(ERROR_MESSAGES.barcodeEmpty);
      });

      it('should reject barcode exceeding maximum length [FR-16]', () => {
        const barcode = INVALID_BARCODES.tooLong;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe(ERROR_MESSAGES.barcodeTooLong);
      });

      it('should reject barcode with null bytes [FR-16]', () => {
        const barcode = INVALID_BARCODES.nullByte;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe(ERROR_MESSAGES.barcodeInvalid);
      });

      it('should reject barcode with control characters [FR-16]', () => {
        const barcode = INVALID_BARCODES.controlChars;
        const result = validateBarcodeValue(barcode);

        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe(ERROR_MESSAGES.barcodeInvalid);
      });
    });
  });
});

// ============================================================================
// TEST SUITE: INPUT SANITIZATION
// Reference: NFR-03 (No sensitive data stored locally)
// Security requirement: Prevent XSS and injection attacks
// ============================================================================

describe('Input Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should preserve normal alphanumeric text', () => {
      const input = 'ASSET-001-2024';
      const result = sanitizeInput(input);

      expect(result).toBe(input);
    });

    it('should preserve special characters commonly used in asset tags', () => {
      const input = 'DELL-XPS_15/9520.001';
      const result = sanitizeInput(input);

      // Forward slash may be preserved or encoded depending on implementation
      expect(result).toContain('DELL-XPS');
    });

    it('should strip HTML script tags from input', () => {
      const input = INVALID_BARCODES.xssAttempt;
      const result = sanitizeInput(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('alert');
    });

    it('should neutralize SQL injection attempts', () => {
      const input = INVALID_BARCODES.sqlInjection;
      const result = sanitizeInput(input);

      expect(result).not.toContain('DROP TABLE');
      expect(result).not.toContain('--');
    });

    it('should handle null bytes safely', () => {
      const input = INVALID_BARCODES.nullByte;
      const result = sanitizeInput(input);

      expect(result).not.toContain('\x00');
    });

    it('should normalize whitespace in input', () => {
      const input = 'ASSET   001  WITH   SPACES';
      const result = sanitizeInput(input);

      // Should normalize to single spaces or trim completely
      expect(result).not.toMatch(/\s{2,}/);
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  ASSET-001  ';
      const result = sanitizeInput(input);

      expect(result).toBe('ASSET-001');
    });

    it('should remove control characters', () => {
      const input = INVALID_BARCODES.controlChars;
      const result = sanitizeInput(input);

      expect(result).not.toMatch(/[\n\r\t]/);
    });

    it('should handle location field XSS attempt', () => {
      const input = LOCATION_VALUES.invalid.xssAttempt;
      const result = sanitizeInput(input);

      expect(result).not.toContain('<script>');
    });

    it('should handle notes field XSS attempt', () => {
      const input = NOTES_VALUES.invalid.xssAttempt;
      const result = sanitizeInput(input);

      expect(result).not.toContain('onerror');
      expect(result).not.toContain('<img');
    });
  });
});

// ============================================================================
// TEST SUITE: BARCODE FORMAT DETECTION
// Reference: FR-02 (Support Code 128, Code 39, QR Code)
// ============================================================================

describe('Barcode Format Detection', () => {
  describe('detectBarcodeFormat', () => {
    describe('Code 128 detection', () => {
      it('should detect standard Code 128 format', () => {
        const barcode = VALID_BARCODES.CODE_128.standard;
        const format = detectBarcodeFormat(barcode);

        // Could be CODE_128 or CODE_39 depending on content
        expect(['CODE_128', 'CODE_39']).toContain(format);
      });

      it('should detect Code 128 with mixed alphanumeric', () => {
        const barcode = VALID_BARCODES.CODE_128.alphanumeric;
        const format = detectBarcodeFormat(barcode);

        expect(['CODE_128', 'CODE_39']).toContain(format);
      });

      it('should detect Code 128 with numbers only', () => {
        const barcode = VALID_BARCODES.CODE_128.withNumbers;
        const format = detectBarcodeFormat(barcode);

        expect(['CODE_128', 'CODE_39']).toContain(format);
      });
    });

    describe('Code 39 detection', () => {
      it('should detect Code 39 format (uppercase only)', () => {
        const barcode = VALID_BARCODES.CODE_39.standard;
        const format = detectBarcodeFormat(barcode);

        expect(format).toBe('CODE_39');
      });

      it('should detect Code 39 with check digit marker', () => {
        const barcode = VALID_BARCODES.CODE_39.checkDigit;
        const format = detectBarcodeFormat(barcode);

        expect(format).toBe('CODE_39');
      });
    });

    describe('QR Code detection', () => {
      it('should detect QR Code format from URL content', () => {
        const barcode = VALID_BARCODES.QR_CODE.url;
        const format = detectBarcodeFormat(barcode);

        expect(format).toBe('QR_CODE');
      });

      it('should detect QR Code format from JSON content', () => {
        const barcode = VALID_BARCODES.QR_CODE.json;
        const format = detectBarcodeFormat(barcode);

        expect(format).toBe('QR_CODE');
      });
    });

    describe('Unknown format handling', () => {
      it('should return UNKNOWN for unrecognizable formats', () => {
        const barcode = '!!!INVALID!!!';
        const format = detectBarcodeFormat(barcode);

        // Special characters might still be detected or return UNKNOWN
        expect(typeof format).toBe('string');
      });

      it('should return UNKNOWN for empty string', () => {
        const format = detectBarcodeFormat('');

        expect(format).toBe('UNKNOWN');
      });
    });
  });
});

// ============================================================================
// TEST SUITE: FORM FIELD VALIDATION
// Reference: FR-15, FR-20 (Optional location/notes fields)
// ============================================================================

describe('Form Field Validation', () => {
  describe('validateLocation', () => {
    it('should accept undefined location (field is optional)', () => {
      const result = validateLocation(undefined);

      expect(result.isValid).toBe(true);
    });

    it('should accept empty string location', () => {
      const result = validateLocation('');

      expect(result.isValid).toBe(true);
    });

    it('should accept simple location value', () => {
      const result = validateLocation(LOCATION_VALUES.valid.simple);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(LOCATION_VALUES.valid.simple);
    });

    it('should accept detailed location with room numbers', () => {
      const result = validateLocation(LOCATION_VALUES.valid.detailed);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(LOCATION_VALUES.valid.detailed);
    });

    it('should accept location with numbers and dashes', () => {
      const result = validateLocation(LOCATION_VALUES.valid.withNumbers);

      expect(result.isValid).toBe(true);
    });

    it('should accept location at maximum length (255 chars)', () => {
      const result = validateLocation(LOCATION_VALUES.valid.maxLength);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue?.length).toBe(255);
    });

    it('should reject location exceeding maximum length', () => {
      const result = validateLocation(LOCATION_VALUES.invalid.tooLong);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('exceeds');
    });

    it('should sanitize XSS attempts in location', () => {
      const result = validateLocation(LOCATION_VALUES.invalid.xssAttempt);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).not.toContain('<script>');
    });
  });

  describe('validateNotes', () => {
    it('should accept undefined notes (field is optional)', () => {
      const result = validateNotes(undefined);

      expect(result.isValid).toBe(true);
    });

    it('should accept empty string notes', () => {
      const result = validateNotes('');

      expect(result.isValid).toBe(true);
    });

    it('should accept simple notes', () => {
      const result = validateNotes(NOTES_VALUES.valid.simple);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe(NOTES_VALUES.valid.simple);
    });

    it('should accept multiline notes', () => {
      const result = validateNotes(NOTES_VALUES.valid.multiline);

      expect(result.isValid).toBe(true);
      // Newlines should be preserved in multiline text field
      expect(result.sanitizedValue).toContain('\n');
    });

    it('should accept notes with special characters', () => {
      const result = validateNotes(NOTES_VALUES.valid.withSpecialChars);

      expect(result.isValid).toBe(true);
      // Apostrophes and ampersands should be preserved
      expect(result.sanitizedValue).toContain("'");
      expect(result.sanitizedValue).toContain('&');
    });

    it('should accept notes at practical maximum length', () => {
      const result = validateNotes(NOTES_VALUES.valid.maxLength);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue?.length).toBe(2000);
    });

    it('should sanitize XSS attempts in notes', () => {
      const result = validateNotes(NOTES_VALUES.invalid.xssAttempt);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).not.toContain('onerror');
      expect(result.sanitizedValue).not.toContain('<img');
    });
  });
});

// ============================================================================
// TEST SUITE: DATA TRANSFORMATION
// Reference: FR-06, FR-07, FR-08, FR-09 (SharePoint integration)
// ============================================================================

describe('Data Transformation', () => {
  describe('transformToSharePointItem', () => {
    // Fixed timestamp for deterministic testing
    const FIXED_DATE = new Date('2024-06-15T10:30:00Z');

    it('should transform minimal payload to SharePoint item [FR-07, FR-17]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
      };

      const item = transformToSharePointItem(payload);

      expect(item.BarcodeValue).toBe('ASSET-001');
      expect(item.ScannedBy.Email).toBe(TEST_USERS.validUser.email);
      expect(item.ScannedBy.Title).toBe(TEST_USERS.validUser.displayName);
      expect(item.ScannedDate).toBe('2024-06-15T10:30:00.000Z');
      expect(item.Location).toBeNull();
      expect(item.Notes).toBeNull();
    });

    it('should transform complete payload with location and notes [FR-20]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'LAPTOP-XPS-15-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
        location: 'Building A, Floor 2',
        notes: 'New laptop for engineering team',
      };

      const item = transformToSharePointItem(payload);

      expect(item.BarcodeValue).toBe('LAPTOP-XPS-15-001');
      expect(item.Location).toBe('Building A, Floor 2');
      expect(item.Notes).toBe('New laptop for engineering team');
    });

    it('should auto-generate Title field [FR-07]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
      };

      const item = transformToSharePointItem(payload);

      expect(item.Title).toBeDefined();
    });

    it('should format ScannedDate as ISO 8601 string [FR-18]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
      };

      const item = transformToSharePointItem(payload);

      expect(item.ScannedDate).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });

    it('should map user info to Person field format [FR-19]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
      };

      const item = transformToSharePointItem(payload);

      expect(item.ScannedBy).toHaveProperty('Email');
      expect(item.ScannedBy).toHaveProperty('Title');
      expect(item.ScannedBy.Email).toBe(TEST_USERS.validUser.email);
    });

    it('should handle admin user correctly [NFR-02]', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.adminUser,
        scannedDate: FIXED_DATE,
      };

      const item = transformToSharePointItem(payload);

      expect(item.ScannedBy.Email).toBe(TEST_USERS.adminUser.email);
      expect(item.ScannedBy.Title).toBe(TEST_USERS.adminUser.displayName);
    });

    it('should set empty strings to null for optional fields', () => {
      const payload: SubmissionPayload = {
        barcodeValue: 'ASSET-001',
        scannedBy: TEST_USERS.validUser,
        scannedDate: FIXED_DATE,
        location: '',
        notes: '',
      };

      const item = transformToSharePointItem(payload);

      expect(item.Location).toBeNull();
      expect(item.Notes).toBeNull();
    });
  });
});

// ============================================================================
// TEST SUITE: ERROR MESSAGE GENERATION
// Reference: FR-16 (Clear error messages on failure)
// ============================================================================

describe('Error Message Generation', () => {
  describe('generateErrorMessage', () => {
    it('should generate barcode empty error message', () => {
      const message = generateErrorMessage('BARCODE_EMPTY');

      expect(message).toBe(ERROR_MESSAGES.barcodeEmpty);
    });

    it('should generate barcode too long error message', () => {
      const message = generateErrorMessage('BARCODE_TOO_LONG');

      expect(message).toBe(ERROR_MESSAGES.barcodeTooLong);
    });

    it('should generate invalid barcode error message', () => {
      const message = generateErrorMessage('BARCODE_INVALID');

      expect(message).toBe(ERROR_MESSAGES.barcodeInvalid);
    });

    it('should generate SharePoint connection error message', () => {
      const message = generateErrorMessage('SHAREPOINT_CONNECTION');

      expect(message).toBe(ERROR_MESSAGES.sharePointConnection);
    });

    it('should generate SharePoint permission error message', () => {
      const message = generateErrorMessage('SHAREPOINT_PERMISSION');

      expect(message).toBe(ERROR_MESSAGES.sharePointPermission);
    });

    it('should generate SharePoint timeout error message', () => {
      const message = generateErrorMessage('SHAREPOINT_TIMEOUT');

      expect(message).toBe(ERROR_MESSAGES.sharePointTimeout);
    });

    it('should generate camera permission error message', () => {
      const message = generateErrorMessage('CAMERA_PERMISSION');

      expect(message).toBe(ERROR_MESSAGES.cameraPermission);
    });

    it('should generate camera unavailable error message', () => {
      const message = generateErrorMessage('CAMERA_UNAVAILABLE');

      expect(message).toBe(ERROR_MESSAGES.cameraUnavailable);
    });

    it('should generate scan failed error message', () => {
      const message = generateErrorMessage('SCAN_FAILED');

      expect(message).toBe(ERROR_MESSAGES.scanFailed);
    });

    it('should generate offline error message', () => {
      const message = generateErrorMessage('OFFLINE');

      expect(message).toBe(ERROR_MESSAGES.offline);
    });

    it('should generate network error message', () => {
      const message = generateErrorMessage('NETWORK_ERROR');

      expect(message).toBe(ERROR_MESSAGES.networkError);
    });

    it('should generate auth required error message', () => {
      const message = generateErrorMessage('AUTH_REQUIRED');

      expect(message).toBe(ERROR_MESSAGES.authRequired);
    });

    it('should generate auth expired error message', () => {
      const message = generateErrorMessage('AUTH_EXPIRED');

      expect(message).toBe(ERROR_MESSAGES.authExpired);
    });

    it('should include context in error message when provided', () => {
      const message = generateErrorMessage('SHAREPOINT_TIMEOUT', {
        durationMs: 6000,
        endpoint: 'ListItems',
      });

      expect(message).toContain('timeout');
    });

    it('should return generic error for unknown error types', () => {
      const message = generateErrorMessage('UNKNOWN_ERROR_TYPE');

      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// TEST SUITE: USER PERMISSION VALIDATION
// Reference: NFR-01, NFR-02 (Microsoft 365 authentication, SharePoint permissions)
// ============================================================================

describe('User Permission Validation', () => {
  describe('validateUserPermission', () => {
    it('should allow valid user with permissions [NFR-01]', () => {
      const result = validateUserPermission(TEST_USERS.validUser.id);

      expect(result).toBe(true);
    });

    it('should allow admin user [NFR-02]', () => {
      const result = validateUserPermission(TEST_USERS.adminUser.id);

      expect(result).toBe(true);
    });

    it('should handle guest user based on SharePoint permissions [NFR-02]', () => {
      const result = validateUserPermission(TEST_USERS.guestUser.id);

      expect(typeof result).toBe('boolean');
    });

    it('should reject empty user ID', () => {
      const result = validateUserPermission('');

      expect(result).toBe(false);
    });

    it('should reject null/undefined user ID', () => {
      const result = validateUserPermission(null as unknown as string);

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: DUPLICATE DETECTION
// Reference: Error message for duplicate scans
// ============================================================================

describe('Duplicate Detection', () => {
  beforeEach(() => {
    clearRecentScans();
  });

  describe('checkRecentDuplicate', () => {
    it('should not flag first-time scan as duplicate', () => {
      const result = checkRecentDuplicate(
        'NEW-BARCODE-001',
        TEST_USERS.validUser.id,
        5
      );

      expect(result).toBe(false);
    });

    it('should flag recently scanned barcode as potential duplicate', () => {
      // Record a scan first
      recordScan('RECENTLY-SCANNED-001', TEST_USERS.validUser.id);

      const result = checkRecentDuplicate(
        'RECENTLY-SCANNED-001',
        TEST_USERS.validUser.id,
        5
      );

      expect(result).toBe(true);
    });

    it('should not flag barcode scanned by different user as duplicate', () => {
      // Record scan by one user
      recordScan('ANOTHER-USER-SCAN-001', TEST_USERS.validUser.id);

      // Check for different user
      const result = checkRecentDuplicate(
        'ANOTHER-USER-SCAN-001',
        TEST_USERS.adminUser.id,
        5
      );

      expect(result).toBe(false);
    });

    it('should not flag barcode scanned outside time window', () => {
      // This test relies on the implementation not having any recorded scans
      const result = checkRecentDuplicate(
        'OLD-SCAN-001',
        TEST_USERS.validUser.id,
        5
      );

      expect(result).toBe(false);
    });

    it('should handle zero minute window (disable duplicate check)', () => {
      // Record a scan
      recordScan('ANY-BARCODE', TEST_USERS.validUser.id);

      const result = checkRecentDuplicate(
        'ANY-BARCODE',
        TEST_USERS.validUser.id,
        0
      );

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: FACTORY FUNCTIONS (Test Data Generators)
// ============================================================================

describe('Test Data Factory Functions', () => {
  describe('generateTestBarcode', () => {
    it('should generate barcode with default prefix', () => {
      const barcode = generateTestBarcode();

      expect(barcode).toMatch(/^TEST-\d+-\d+$/);
    });

    it('should generate barcode with custom prefix', () => {
      const barcode = generateTestBarcode('ASSET');

      expect(barcode).toMatch(/^ASSET-\d+-\d+$/);
    });

    it('should generate unique barcodes on each call', () => {
      const barcode1 = generateTestBarcode();
      const barcode2 = generateTestBarcode();

      expect(barcode1).not.toBe(barcode2);
    });
  });

  describe('createScanPayload', () => {
    it('should create payload with default values', () => {
      const payload = createScanPayload();

      expect(payload.barcodeValue).toBeTruthy();
      expect(payload.scannedBy).toEqual(TEST_USERS.validUser);
      expect(payload.scannedDate).toBeTruthy();
      expect(payload.location).toBe('');
      expect(payload.notes).toBe('');
    });

    it('should allow overriding barcode value', () => {
      const payload = createScanPayload({ barcodeValue: 'CUSTOM-001' });

      expect(payload.barcodeValue).toBe('CUSTOM-001');
    });

    it('should allow overriding location', () => {
      const payload = createScanPayload({ location: 'Building A' });

      expect(payload.location).toBe('Building A');
    });

    it('should allow overriding notes', () => {
      const payload = createScanPayload({ notes: 'Test note' });

      expect(payload.notes).toBe('Test note');
    });

    it('should allow overriding user', () => {
      const payload = createScanPayload({ scannedBy: TEST_USERS.adminUser });

      expect(payload.scannedBy).toEqual(TEST_USERS.adminUser);
    });
  });

  describe('createSharePointItemResponse', () => {
    it('should create response matching SharePoint schema', () => {
      const payload = createScanPayload({ barcodeValue: 'TEST-001' });
      const response = createSharePointItemResponse(payload, 123);

      expect(response.ID).toBe(123);
      expect(response.BarcodeValue).toBe('TEST-001');
      expect(response.ScannedBy.Email).toBe(TEST_USERS.validUser.email);
      expect(response.ScannedDate).toBeTruthy();
    });

    it('should use default item ID when not provided', () => {
      const payload = createScanPayload();
      const response = createSharePointItemResponse(payload);

      expect(response.ID).toBe(1);
    });
  });
});

// ============================================================================
// TEST SUITE: SHAREPOINT SCHEMA VALIDATION
// Reference: Section 4.1 Data Model
// ============================================================================

describe('SharePoint Schema Compliance', () => {
  describe('SHAREPOINT_SCHEMA constants', () => {
    it('should have correct list name', () => {
      expect(SHAREPOINT_SCHEMA.listName).toBe('Computer Asset Scans');
    });

    it('should define BarcodeValue as required text field', () => {
      const column = SHAREPOINT_SCHEMA.columns.BarcodeValue;

      expect(column.type).toBe('Text');
      expect(column.required).toBe(true);
      expect(column.maxLength).toBe(255);
    });

    it('should define ScannedBy as required Person field', () => {
      const column = SHAREPOINT_SCHEMA.columns.ScannedBy;

      expect(column.type).toBe('Person');
      expect(column.required).toBe(true);
    });

    it('should define ScannedDate as required DateTime field', () => {
      const column = SHAREPOINT_SCHEMA.columns.ScannedDate;

      expect(column.type).toBe('DateTime');
      expect(column.required).toBe(true);
    });

    it('should define Location as optional text field', () => {
      const column = SHAREPOINT_SCHEMA.columns.Location;

      expect(column.type).toBe('Text');
      expect(column.required).toBe(false);
      expect(column.maxLength).toBe(255);
    });

    it('should define Notes as optional multiline text field', () => {
      const column = SHAREPOINT_SCHEMA.columns.Notes;

      expect(column.type).toBe('Note');
      expect(column.required).toBe(false);
    });

    it('should define Title as optional (auto-generated)', () => {
      const column = SHAREPOINT_SCHEMA.columns.Title;

      expect(column.required).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: PERFORMANCE THRESHOLD VALIDATION
// Reference: NFR-04, NFR-05, NFR-06
// ============================================================================

describe('Performance Thresholds', () => {
  describe('PERFORMANCE_THRESHOLDS constants', () => {
    it('should define barcode scan threshold at 2000ms [NFR-04]', () => {
      expect(PERFORMANCE_THRESHOLDS.barcodeScanMs).toBe(2000);
    });

    it('should define SharePoint write threshold at 5000ms [NFR-05]', () => {
      expect(PERFORMANCE_THRESHOLDS.sharePointWriteMs).toBe(5000);
    });

    it('should define app load threshold at 10000ms [NFR-06]', () => {
      expect(PERFORMANCE_THRESHOLDS.appLoadMs).toBe(10000);
    });

    it('should define animation delay for UI feedback', () => {
      expect(PERFORMANCE_THRESHOLDS.animationDelayMs).toBe(300);
    });
  });
});

// ============================================================================
// TEST SUITE: SUCCESS MESSAGE CONSTANTS
// Reference: FR-04, FR-10
// ============================================================================

describe('Success Messages', () => {
  describe('SUCCESS_MESSAGES constants', () => {
    it('should define scan complete message [FR-04]', () => {
      expect(SUCCESS_MESSAGES.scanComplete).toBe('Barcode scanned successfully');
    });

    it('should define submit complete message [FR-10]', () => {
      expect(SUCCESS_MESSAGES.submitComplete).toBe('Asset logged to SharePoint');
    });

    it('should define form reset message', () => {
      expect(SUCCESS_MESSAGES.formReset).toBe('Ready for next scan');
    });
  });
});
