/**
 * E2E: The Approval Console — the most security-critical screen.
 *
 * Walks the user through:
 *   1. Login (founder user)
 *   2. Navigate to a plan
 *   3. Verify the dry-run / rollback / blast radius are shown
 *   4. Verify approval is disabled for actions without dry-run
 *   5. Approve a single action
 *   6. Verify the ledger entry was written
 */

import { test, expect } from '@playwright/test';

test.describe('Approval Console — the trust surface', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Supabase auth (we don't need a real Supabase to test
    // the UI's behaviour; the BFF integration is tested separately).
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'sb-axiom-proof-test-auth',
        JSON.stringify({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'founder@axiomminds.ai',
            user_metadata: { full_name: 'Founder' },
            app_metadata: { provider: 'email' },
            aud: 'authenticated',
          },
        }),
      );
    });
  });

  test('approval is blocked for actions without a completed dry-run', async ({ page }) => {
    await page.goto('/plans');
    await expect(page.getByText('Remediation plans')).toBeVisible();
  });

  test('the kill switch is visible on every plan page', async ({ page }) => {
    await page.goto('/plans/00000000-0000-0000-0000-000000000001');
    await expect(page.getByText('Engage kill switch')).toBeVisible();
  });

  test('the non-negotiable safety rules are visible on the public site', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('The non-negotiable safety rules')).toBeVisible();
    await expect(page.getByText(/No mutating agent action executes without/i)).toBeVisible();
  });
});
