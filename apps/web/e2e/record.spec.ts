import { expect, test } from '@playwright/test';

test('record a voiceover for a scene and attach it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Record test');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible();

  await page.getByRole('button', { name: 'Record voiceover', exact: true }).first().click();
  const rec = page.getByRole('dialog');
  await expect(rec.getByText('Record voiceover')).toBeVisible();
  await rec.getByRole('button', { name: 'Start recording' }).click();
  await expect(rec.getByText('Recording…')).toBeVisible();
  // Headless Chromium's fake microphone is silent, so only check the meter exists and time advances.
  await expect(rec.getByRole('meter')).toBeVisible();
  await expect
    .poll(async () => await rec.getByTestId('record-elapsed').textContent())
    .not.toBe('0s');
  await page.waitForTimeout(1200);
  await rec.getByRole('button', { name: 'Stop recording' }).click();
  await expect(rec.getByText('Take ready')).toBeVisible({ timeout: 15_000 });
  await expect(rec.getByLabel('Preview take')).toBeVisible();
  await rec.getByRole('button', { name: 'Use for this scene' }).click();

  // Attached: the voiceover field shows the recording and the scene follows its length.
  await expect(page.getByText('Voiceover attached')).toBeVisible();
  const voiceSelect = page.locator('select').filter({ hasText: /Recording .*\.wav/ });
  await expect(voiceSelect).toBeVisible();
  await expect(voiceSelect.locator('option:checked')).toHaveText(/Recording .*\.wav/);
  await expect(page.getByText(/Following the voiceover length/)).toBeVisible();
});
