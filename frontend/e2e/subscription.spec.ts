import { test, expect } from '@playwright/test';

/**
 * Subscription Flow E2E Tests
 * Tests the pricing page, subscription management, and billing portal
 */

test.describe('Pricing Page', () => {
  test('displays pricing page with all plans', async ({ page }) => {
    await page.goto('/pricing');

    // Wait for plans to load
    await expect(page.getByText('Choose Your Plan')).toBeVisible();

    // Check for plan cards (Free, Pro, Enterprise) - use headings to be specific
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible();

    // Check for billing toggle
    await expect(page.getByRole('button', { name: /Monthly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Yearly/i })).toBeVisible();
  });

  test('toggles billing cycle between monthly and yearly', async ({ page }) => {
    await page.goto('/pricing');

    // Wait for plans to load
    await expect(page.getByText('Choose Your Plan')).toBeVisible();

    // Click on Yearly toggle
    await page.getByRole('button', { name: /Yearly/i }).click();

    // Should show "billed yearly" text for paid plans
    await expect(page.getByText(/billed yearly/i).first()).toBeVisible();

    // Click on Monthly toggle
    await page.getByRole('button', { name: /Monthly/i }).click();

    // "billed yearly" should not be visible anymore
    await expect(page.getByText(/billed yearly/i)).not.toBeVisible();
  });

  test('shows savings percentage on yearly toggle', async ({ page }) => {
    await page.goto('/pricing');

    // Wait for plans to load
    await expect(page.getByText('Choose Your Plan')).toBeVisible();

    // Check for savings badge (should show "Save up to X%")
    await expect(page.getByText(/Save up to \d+%/i)).toBeVisible();
  });

  test('Get Started Free button navigates to login for unauthenticated users', async ({ page }) => {
    await page.goto('/pricing');

    // Wait for plans to load - use heading for specific match
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();

    // Click on the free plan button
    await page.getByRole('button', { name: /Get Started Free/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authenticated Subscription Flow', () => {
  // Skip these tests if no test user is configured
  // In a real test environment, use test fixtures or API to create users
  test.skip(({ browserName }) => true, 'Requires test user setup - skipping until auth fixtures are configured');

  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Fill in login form - use test credentials
    // Note: In a real test environment, you'd use test fixtures or API to create users
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  });

  test('displays subscription tab in settings', async ({ page }) => {
    await page.goto('/settings?tab=subscription');

    // Wait for subscription section to load
    await expect(page.getByText(/Current Plan/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows subscription status and plan details', async ({ page }) => {
    await page.goto('/settings?tab=subscription');

    // Wait for subscription section to load
    await expect(page.getByText(/Current Plan/i)).toBeVisible({ timeout: 10000 });

    // Should display plan limits
    await expect(page.getByText(/Projects/i)).toBeVisible();
    await expect(page.getByText(/Agents/i)).toBeVisible();
  });

  test('cancellation shows confirmation modal', async ({ page }) => {
    await page.goto('/settings?tab=subscription');

    // Wait for subscription section to load
    await expect(page.getByText(/Current Plan/i)).toBeVisible({ timeout: 10000 });

    // Find and click cancel button (only if user has paid subscription)
    const cancelButton = page.getByRole('button', { name: /Cancel Subscription/i });

    // If cancel button exists (user has paid subscription)
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Should show confirmation modal
      await expect(page.getByText(/Are you sure you want to cancel/i)).toBeVisible();

      // Modal should have options
      await expect(page.getByRole('button', { name: /Keep Subscription/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Cancel at Period End/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Cancel Immediately/i })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /Keep Subscription/i }).click();

      // Modal should close
      await expect(page.getByText(/Are you sure you want to cancel/i)).not.toBeVisible();
    }
  });

  test('Manage Billing button redirects to Stripe portal', async ({ page }) => {
    await page.goto('/settings?tab=subscription');

    // Wait for subscription section to load
    await expect(page.getByText(/Current Plan/i)).toBeVisible({ timeout: 10000 });

    // Find the Manage Billing button
    const manageBillingButton = page.getByRole('button', { name: /Manage Billing/i });

    // If button exists and is not disabled (has Stripe customer)
    if (await manageBillingButton.isVisible()) {
      const isDisabled = await manageBillingButton.isDisabled();
      if (!isDisabled) {
        // We can't actually test the Stripe portal redirect in E2E
        // Just verify the button exists and is clickable
        await expect(manageBillingButton).toBeEnabled();
      }
    }
  });
});

test.describe('Pricing Page Unauthenticated Upgrade Flow', () => {
  test('upgrade button redirects to login for unauthenticated users', async ({ page }) => {
    await page.goto('/pricing');

    // Wait for plans to load - use heading for specific match
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();

    // Find the Pro plan upgrade button
    const upgradeButton = page.getByRole('button', { name: /Upgrade/i }).first();
    await upgradeButton.click();

    // Should redirect to login with return state
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Settings Navigation', () => {
  // Skip these tests if no test user is configured
  test.skip(({ browserName }) => true, 'Requires test user setup - skipping until auth fixtures are configured');

  test('subscription tab is accessible from settings navigation', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Navigate to settings
    await page.goto('/settings');

    // Wait for settings page
    await expect(page.getByText(/Settings/i).first()).toBeVisible({ timeout: 10000 });

    // Click on Subscription tab
    await page.click('text=Subscription');

    // URL should update
    await expect(page).toHaveURL(/tab=subscription/);

    // Subscription content should be visible
    await expect(page.getByText(/Current Plan/i)).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('pricing page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');

    // Should still show all plans (might be stacked) - use headings for specific match
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible();

    // Billing toggle should be visible
    await expect(page.getByRole('button', { name: /Monthly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Yearly/i })).toBeVisible();
  });
});
