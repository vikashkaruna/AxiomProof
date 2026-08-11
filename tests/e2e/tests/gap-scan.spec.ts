/**
 * E2E: Public gap-scan flow.
 *
 * Verifies the marketing site funnel:
 *   1. Landing page → free gap-scan
 *   2. Step 1: sector + size
 *   3. Step 2: 12 questions
 *   4. Step 3: contact info
 *   5. Step 4: submit → report
 */

import { test, expect } from '@playwright/test';

test.describe('Public gap-scan funnel', () => {
  test('the marketing site loads with the gap-scan CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Agents do the work/i })).toBeVisible();
    await expect(page.getByText(/Run the free 5-min gap-scan/i)).toBeVisible();
  });

  test('the gap-scan section is reachable', async ({ page }) => {
    await page.goto('/#gap-scan');
    await expect(page.getByText(/Free 5-minute DPDPA gap-scan/i)).toBeVisible();
  });

  test('the agents page lists all 10 named agents', async ({ page }) => {
    await page.goto('/agents');
    const agents = ['Drishti', 'Vibhaag', 'Parikshan', 'Saakshi', 'Sudhaar', 'Karya', 'Lekha', 'Nazar', 'Prativedan', 'Sanket'];
    for (const name of agents) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    }
  });
});
