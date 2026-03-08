/**
 * Encore Brand Theme
 * Based on https://encore.tech/ branding analysis
 */

// Brand Colors
export const encoreColors = {
  // Primary brand colors
  primaryBlue: '#0089D1',
  deepNavy: '#103DBE',
  charcoal: '#232323',

  // Neutral palette
  bodyGray: '#6F6F6F',
  lightGray: '#F5F5F5',
  borderGray: '#E0E0E0',
  white: '#FFFFFF',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Gradient
  primaryGradient: 'linear-gradient(135deg, #0089D1 0%, #103DBE 100%)',
};

// Typography
export const encoreTypography = {
  fontFamily: {
    heading: '"Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: '"Karla", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    '4xl': '32px',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
};

// Spacing (8px grid system)
export const encoreSpacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Border Radius
export const encoreBorderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// Shadows
export const encoreShadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 8px 24px rgba(0, 137, 209, 0.15)',
};

// Transitions
export const encoreTransitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
};

// Combined theme object for convenience
export const encoreTheme = {
  colors: encoreColors,
  typography: encoreTypography,
  spacing: encoreSpacing,
  borderRadius: encoreBorderRadius,
  shadows: encoreShadows,
  transitions: encoreTransitions,
};

export default encoreTheme;
