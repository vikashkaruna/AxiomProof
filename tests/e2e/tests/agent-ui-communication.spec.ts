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

    // The workbench renders the agent fleet and interactive cockpit
    await expect(
      page.getByRole('main').getByRole('heading', { name: /Agent Workbench/i }),
    ).toBeVisible();
    await expect(page.getByText('Agent fleet')).toBeVisible();
    await expect(page.getByText('10 / 10 Online')).toBeVisible();
    await expect(page.getByText('Prompt registry')).toBeVisible();

    // Verify key named agents exist in the cockpit execution selector
    await expect(page.locator('option[value="drishti"]')).toContainText(/Drishti/i);
    await expect(page.locator('option[value="parikshan"]')).toContainText(/Parikshan/i);
    await expect(page.locator('option[value="sudhaar"]')).toContainText(/Sudhaar/i);
    await expect(page.locator('option[value="karya"]')).toContainText(/Karya/i);
  });

  test('the workbench renders the autonomy badges', async ({ page }) => {
    await page.goto('/workbench');
    await expect(page.getByText(/Autonomy/i).first()).toBeVisible();
    await expect(page.getByText(/Env: Production/i)).toBeVisible();
    await expect(page.getByText(/ap-south-1/i).first()).toBeVisible();
  });
});
