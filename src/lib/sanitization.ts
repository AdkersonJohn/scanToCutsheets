/**
 * Input Sanitization Library
 *
 * Provides security-focused input sanitization to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection attempts
 * - Control character injection
 *
 * Requirement: NFR-03 (No sensitive data, secure handling)
 */

/**
 * HTML entities that need to be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Sanitizes input to prevent XSS attacks
 * Requirement: NFR-03
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for display
 */
export function sanitizeForDisplay(input: string): string {
  if (!input) return '';

  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes input for storage (removes dangerous patterns)
 * Requirement: NFR-03
 *
 * @param input - Raw user input
 * @returns Sanitized string safe for storage
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs for notes field)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove potential script injection patterns
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');

  // Escape HTML entities for safe storage
  sanitized = sanitizeForDisplay(sanitized);

  return sanitized.trim();
}

/**
 * Sanitizes input specifically for barcode values
 * More restrictive - only allows barcode-safe characters
 * Requirement: FR-02, NFR-03
 *
 * @param input - Raw barcode value
 * @returns Sanitized barcode string
 */
export function sanitizeBarcodeValue(input: string): string {
  if (!input) return '';

  // Remove all control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Checks if a string contains potential SQL injection patterns
 * Requirement: NFR-03
 *
 * @param input - String to check
 * @returns True if potential SQL injection detected
 */
export function containsSqlInjection(input: string): boolean {
  if (!input) return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--)/, // SQL comment
    /(;)/, // Statement terminator
    /(\bOR\b\s+\d+\s*=\s*\d+)/i, // OR 1=1 pattern
    /(\bAND\b\s+\d+\s*=\s*\d+)/i, // AND 1=1 pattern
    /(\/\*.*\*\/)/, // Block comment
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Checks if a string contains potential XSS patterns
 * Requirement: NFR-03
 *
 * @param input - String to check
 * @returns True if potential XSS detected
 */
export function containsXss(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<img[^>]+onerror/i,
    /expression\s*\(/i, // CSS expression
    /url\s*\(\s*["']?\s*data:/i, // data: URLs
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive input sanitization with threat detection
 * Requirement: NFR-03
 *
 * @param input - Raw user input
 * @returns Sanitization result with sanitized value and any warnings
 */
export function sanitizeWithWarnings(input: string): {
  sanitized: string;
  hadSqlInjection: boolean;
  hadXss: boolean;
  wasModified: boolean;
} {
  const hadSqlInjection = containsSqlInjection(input);
  const hadXss = containsXss(input);
  const sanitized = sanitizeInput(input);

  return {
    sanitized,
    hadSqlInjection,
    hadXss,
    wasModified: sanitized !== input,
  };
}
