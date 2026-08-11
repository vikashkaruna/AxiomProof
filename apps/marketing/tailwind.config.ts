import type { Config } from 'tailwindcss';
import preset from '@axiom/design-tokens/tailwind';

export default {
  presets: [preset],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/design-tokens/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
