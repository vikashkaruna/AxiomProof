/**
 * Spacing, radii, shadows, motion tokens.
 *
 * 4-pt base grid. Shadows lean restrained — institutional trust signal.
 */

export const spacing = {
  0: '0px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem',
  12: '3rem', // 48px
  14: '3.5rem',
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem',
  32: '8rem', // 128px
  36: '9rem',
  40: '10rem', // 160px
  44: '11rem',
  48: '12rem', // 192px
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem', // 256px
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

export const borderRadius = {
  none: '0px',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

export const boxShadow = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  DEFAULT: '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md: '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg: '0 12px 24px -6px rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
  xl: '0 24px 48px -12px rgb(0 0 0 / 0.18), 0 8px 16px -8px rgb(0 0 0 / 0.08)',
  '2xl': '0 32px 64px -16px rgb(0 0 0 / 0.22)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.06)',
  // Brand-tinted: indigo primary, teal accent
  'indigo-glow': '0 0 0 4px rgb(30 42 74 / 0.10)',
  'teal-glow': '0 0 0 4px rgb(15 181 165 / 0.18)',
  'gold-glow': '0 0 0 3px rgb(201 162 39 / 0.30)', // proof seal
  'ember-glow': '0 0 0 4px rgb(217 83 79 / 0.18)',
} as const;

export const motion = {
  duration: {
    0: '0ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
