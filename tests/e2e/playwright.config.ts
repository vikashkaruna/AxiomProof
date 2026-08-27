import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..', '..');
const SUPABASE_PORT = process.env.SUPABASE_PORT ?? '55321';
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `http://localhost:${SUPABASE_PORT}`;

const e2eSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key-for-e2e',
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? 'test-anon-key-for-e2e',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ?? 'test-service-key-for-e2e',
  AXIOM_E2E_BYPASS_AUTH: 'true',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'pnpm --filter @axiom/web dev',
          port: 3001,
          cwd: repoRoot,
          env: e2eSupabaseEnv,
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'pnpm --filter @axiom/marketing dev',
          port: 3000,
          cwd: repoRoot,
          env: e2eSupabaseEnv,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
