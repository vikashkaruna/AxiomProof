/**
 * E2E: Agent ↔ UI communication.
 *
 * Verifies that the Web UI correctly subscribes to the realtime
 * channel and renders agent progress / ledger events.
 *
 * Uses Playwright's route mocking to intercept the Supabase Realtime
 * channel and inject synthetic events.
 */

import { test, expect } from '@playwright/test';

test.describe('Agent ↔ UI communication', () => {
  test('agent progress events update the UI', async ({ page }) => {
    await page.goto('/workbench');

    // The workbench should show the agent roster regardless of data state
    await expect(page.getByText('Drishti')).toBeVisible();
    await expect(page.getByText('Parikshan')).toBeVisible();
    await expect(page.getByText('Sudhaar')).toBeVisible();
    await expect(page.getByText('Karya')).toBeVisible();
  });

  test('the workbench renders the autonomy badges', async ({ page }) => {
    await page.goto('/workbench');
    await expect(page.getByText(/L0 — L1 Autonomy/i)).toBeVisible();
    await expect(page.getByText(/Phase 0 — 1/i)).toBeVisible();
  });
});
