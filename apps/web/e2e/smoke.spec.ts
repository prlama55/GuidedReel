import { expect, test } from '@playwright/test';

test.describe('vertical slice', () => {
  test('create a 9:16 Modern Promotional project, edit and add scenes, open export', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'New project' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('e.g. Spring launch promo').fill('E2E promo');
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByRole('button', { name: /9:16/ }).click();
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByRole('button', { name: /Modern Promotional/ }).click();
    await dialog.getByRole('button', { name: 'Create project' }).click();

    await expect(page).toHaveURL(/\/editor\//);
    await expect(page.getByText(/Scenes · 8/)).toBeVisible();

    // Edit the hook text in the inspector; the scene list reflects it.
    const hookText = page.locator('#f-text');
    await expect(hookText).toBeVisible();
    await hookText.fill('Hello from Playwright');
    await expect(page.getByText('Hello from Playwright').first()).toBeVisible();

    // Add a scene from the timeline.
    await page.getByRole('button', { name: 'Add scene at end' }).click();
    await page.getByRole('button', { name: 'Quote', exact: true }).click();
    await expect(page.getByText(/Scenes · 9/)).toBeVisible();

    // Autosave reaches "Saved".
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Export dialog shows the estimate.
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('Est. size')).toBeVisible();

    // Reload: the project persisted in IndexedDB and reopens with the edit.
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByText('Hello from Playwright').first()).toBeVisible();
  });
});
