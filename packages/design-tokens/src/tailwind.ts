/**
 * Tailwind preset: drop this into a consuming app's tailwind.config.ts.
 *
 * Usage:
 *   import preset from '@axiom/design-tokens/tailwind';
 *   export default { presets: [preset], content: [...] };
 */

import type { Config } from 'tailwindcss';
import { colors, agentAccents } from './colors.js';
import { fontFamily, fontSize, fontWeight } from './typography.js';
import { borderRadius, boxShadow, spacing, motion } from './spacing.js';

export const axiomPreset: Partial<Config> = {
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      black: colors.black,
      white: colors.white,
      ...colors,
      // expose agent accents as a dedicated namespace
      agent: agentAccents,
    },
    fontFamily: {
      heading: fontFamily.heading,
      body: fontFamily.body,
      mono: fontFamily.mono,
      sans: fontFamily.body,
    },
    fontSize,
    fontWeight,
    extend: {
      borderRadius,
      boxShadow,
      spacing,
      transitionDuration: motion.duration,
      transitionTimingFunction: motion.easing,
    },
  },
};

export default axiomPreset;
