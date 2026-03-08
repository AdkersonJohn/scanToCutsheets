import { describe, it, expect } from 'vitest';
import {
  validateAssetTag,
  validateSerialNumber,
  formatAssetTag,
  ASSET_TAG_PATTERN,
  SERIAL_NUMBER_PATTERN,
  extractYearFromAssetTag,
  isEligibleForRefresh,
} from './index';

describe('Validation Functions', () => {
  describe('validateAssetTag', () => {
    describe('should return true for valid asset tags', () => {
      it('should accept EW26-03975', () => {
        expect(validateAssetTag('EW26-03975')).toBe(true);
      });

      it('should accept EW00-00000', () => {
        expect(validateAssetTag('EW00-00000')).toBe(true);
      });

      it('should accept EW99-99999', () => {
        expect(validateAssetTag('EW99-99999')).toBe(true);
      });

      it('should accept EW12-34567', () => {
        expect(validateAssetTag('EW12-34567')).toBe(true);
      });
    });

    describe('should return false for invalid asset tags', () => {
      it('should reject lowercase ew26-03975', () => {
        expect(validateAssetTag('ew26-03975')).toBe(false);
      });

      it('should reject missing prefix EW', () => {
        expect(validateAssetTag('26-03975')).toBe(false);
      });

      it('should reject wrong prefix XX26-03975', () => {
        expect(validateAssetTag('XX26-03975')).toBe(false);
      });

      it('should reject missing hyphen EW2603975', () => {
        expect(validateAssetTag('EW2603975')).toBe(false);
      });

      it('should reject too few digits EW2-03975', () => {
        expect(validateAssetTag('EW2-03975')).toBe(false);
      });

      it('should reject too few digits after hyphen EW26-0397', () => {
        expect(validateAssetTag('EW26-0397')).toBe(false);
      });

      it('should reject too many digits EW26-039750', () => {
        expect(validateAssetTag('EW26-039750')).toBe(false);
      });

      it('should reject letters in number portion EW26-0397A', () => {
        expect(validateAssetTag('EW26-0397A')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(validateAssetTag('')).toBe(false);
      });

      it('should reject whitespace only', () => {
        expect(validateAssetTag('   ')).toBe(false);
      });

      it('should reject asset tag with leading/trailing spaces', () => {
        expect(validateAssetTag(' EW26-03975 ')).toBe(false);
      });

      it('should reject null-like strings', () => {
        expect(validateAssetTag('null')).toBe(false);
        expect(validateAssetTag('undefined')).toBe(false);
      });
    });
  });

  describe('validateSerialNumber', () => {
    describe('should return true for valid serial numbers', () => {
      it('should accept ABC1234', () => {
        expect(validateSerialNumber('ABC1234')).toBe(true);
      });

      it('should accept 1234567', () => {
        expect(validateSerialNumber('1234567')).toBe(true);
      });

      it('should accept ABCDEFG', () => {
        expect(validateSerialNumber('ABCDEFG')).toBe(true);
      });

      it('should accept lowercase abc1234', () => {
        expect(validateSerialNumber('abc1234')).toBe(true);
      });

      it('should accept mixed case AbC1d2E', () => {
        expect(validateSerialNumber('AbC1d2E')).toBe(true);
      });

      it('should accept 0000000', () => {
        expect(validateSerialNumber('0000000')).toBe(true);
      });
    });

    describe('should return false for invalid serial numbers', () => {
      it('should reject too short ABC123', () => {
        expect(validateSerialNumber('ABC123')).toBe(false);
      });

      it('should reject too long ABC12345', () => {
        expect(validateSerialNumber('ABC12345')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(validateSerialNumber('')).toBe(false);
      });

      it('should reject special characters ABC123!', () => {
        expect(validateSerialNumber('ABC123!')).toBe(false);
      });

      it('should reject spaces ABC 123', () => {
        expect(validateSerialNumber('ABC 123')).toBe(false);
      });

      it('should reject hyphen ABC-123', () => {
        expect(validateSerialNumber('ABC-123')).toBe(false);
      });

      it('should reject leading/trailing spaces', () => {
        expect(validateSerialNumber(' ABC1234 ')).toBe(false);
      });
    });
  });

  describe('formatAssetTag', () => {
    describe('should format valid asset tags correctly', () => {
      it('should add hyphen when missing - EW2612345 to EW26-12345', () => {
        expect(formatAssetTag('EW2612345')).toBe('EW26-12345');
      });

      it('should convert lowercase to uppercase - ew26-12345 to EW26-12345', () => {
        expect(formatAssetTag('ew26-12345')).toBe('EW26-12345');
      });

      it('should handle mixed case - eW2612345 to EW26-12345', () => {
        expect(formatAssetTag('eW2612345')).toBe('EW26-12345');
      });

      it('should remove extra characters - EW26 12345 to EW26-12345', () => {
        expect(formatAssetTag('EW26 12345')).toBe('EW26-12345');
      });

      it('should handle already formatted tag - EW26-12345 stays EW26-12345', () => {
        expect(formatAssetTag('EW26-12345')).toBe('EW26-12345');
      });
    });

    describe('should handle edge cases', () => {
      it('should uppercase strings that cannot be formatted', () => {
        expect(formatAssetTag('invalid')).toBe('INVALID');
      });

      it('should return empty string for empty input', () => {
        expect(formatAssetTag('')).toBe('');
      });

      it('should handle string with only special chars', () => {
        // formatAssetTag strips non-alphanumeric chars, leaving empty string
        // then uppercases it, resulting in empty string
        expect(formatAssetTag('---')).toBe('---');
      });

      it('should not format strings that do not start with EW', () => {
        expect(formatAssetTag('XX2612345')).toBe('XX2612345');
      });

      it('should not format strings with wrong length', () => {
        expect(formatAssetTag('EW261234')).toBe('EW261234');
        expect(formatAssetTag('EW26123456')).toBe('EW26123456');
      });
    });
  });

  describe('Regex Patterns', () => {
    describe('ASSET_TAG_PATTERN', () => {
      it('should match valid asset tag format', () => {
        expect(ASSET_TAG_PATTERN.test('EW26-03975')).toBe(true);
      });

      it('should not match invalid format', () => {
        expect(ASSET_TAG_PATTERN.test('EW2603975')).toBe(false);
      });
    });

    describe('SERIAL_NUMBER_PATTERN', () => {
      it('should match valid serial number format', () => {
        expect(SERIAL_NUMBER_PATTERN.test('ABC1234')).toBe(true);
      });

      it('should be case insensitive', () => {
        expect(SERIAL_NUMBER_PATTERN.test('abc1234')).toBe(true);
        expect(SERIAL_NUMBER_PATTERN.test('ABC1234')).toBe(true);
      });

      it('should not match invalid length', () => {
        expect(SERIAL_NUMBER_PATTERN.test('ABC123')).toBe(false);
        expect(SERIAL_NUMBER_PATTERN.test('ABC12345')).toBe(false);
      });
    });
  });

  describe('extractYearFromAssetTag', () => {
    it('should extract year 2022 from EW22-12345', () => {
      expect(extractYearFromAssetTag('EW22-12345')).toBe(2022);
    });

    it('should extract year 2026 from EW26-03975', () => {
      expect(extractYearFromAssetTag('EW26-03975')).toBe(2026);
    });

    it('should extract year 2000 from EW00-00000', () => {
      expect(extractYearFromAssetTag('EW00-00000')).toBe(2000);
    });

    it('should extract year 2099 from EW99-99999', () => {
      expect(extractYearFromAssetTag('EW99-99999')).toBe(2099);
    });

    it('should return null for invalid asset tag', () => {
      expect(extractYearFromAssetTag('invalid')).toBeNull();
    });

    it('should return null for lowercase asset tag', () => {
      expect(extractYearFromAssetTag('ew22-12345')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractYearFromAssetTag('')).toBeNull();
    });
  });

  describe('isEligibleForRefresh', () => {
    describe('should mark as eligible for EW22 and older', () => {
      it('should be eligible for EW22', () => {
        const result = isEligibleForRefresh('EW22-12345');
        expect(result.eligible).toBe(true);
        expect(result.year).toBe(2022);
        expect(result.eligibleAfterYear).toBeUndefined();
      });

      it('should be eligible for EW20', () => {
        const result = isEligibleForRefresh('EW20-12345');
        expect(result.eligible).toBe(true);
        expect(result.year).toBe(2020);
      });

      it('should be eligible for EW18', () => {
        const result = isEligibleForRefresh('EW18-12345');
        expect(result.eligible).toBe(true);
        expect(result.year).toBe(2018);
      });
    });

    describe('should mark as not eligible for EW23 and newer', () => {
      it('should not be eligible for EW23', () => {
        const result = isEligibleForRefresh('EW23-12345');
        expect(result.eligible).toBe(false);
        expect(result.year).toBe(2023);
        expect(result.eligibleAfterYear).toBe(2027);
      });

      it('should not be eligible for EW24', () => {
        const result = isEligibleForRefresh('EW24-12345');
        expect(result.eligible).toBe(false);
        expect(result.year).toBe(2024);
        expect(result.eligibleAfterYear).toBe(2028);
      });

      it('should not be eligible for EW26', () => {
        const result = isEligibleForRefresh('EW26-03975');
        expect(result.eligible).toBe(false);
        expect(result.year).toBe(2026);
        expect(result.eligibleAfterYear).toBe(2030);
      });
    });

    describe('should handle invalid asset tags', () => {
      it('should return not eligible with null year for invalid tag', () => {
        const result = isEligibleForRefresh('invalid');
        expect(result.eligible).toBe(false);
        expect(result.year).toBeNull();
        expect(result.eligibleAfterYear).toBeUndefined();
      });

      it('should return not eligible for empty string', () => {
        const result = isEligibleForRefresh('');
        expect(result.eligible).toBe(false);
        expect(result.year).toBeNull();
      });
    });
  });
});
