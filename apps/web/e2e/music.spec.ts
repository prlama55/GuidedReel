import { expect, test } from '@playwright/test';

test('generate music from the scenes, use it and align cuts to the beat', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Music test');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Modern Promotional/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 8/)).toBeVisible();

  // The inspector's Project tab reaches project-wide settings while a scene stays selected…
  await page.getByRole('tab', { name: 'Project' }).click();
  await expect(page.getByRole('button', { name: /Generate music from scenes/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Scene' }).click();
  await expect(page.getByRole('button', { name: /Generate music from scenes/ })).toBeHidden();
  // …and the toolbar Music button opens the generator directly.
  await page.getByRole('button', { name: 'Music', exact: true }).click();
  const music = page.getByRole('dialog');
  await expect(music.getByText('Generate from scenes')).toBeVisible();
  await expect(music.getByLabel('Mood')).toHaveValue('upbeat');
  await music.getByRole('radio', { name: 'Hard' }).click();
  await expect(music.getByText(/Driving: full drums/)).toBeVisible();
  await music.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(music.getByLabel('Preview music')).toBeVisible({ timeout: 60_000 });
  await expect(music.getByRole('radio', { name: 'Background' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await music.getByRole('button', { name: 'Use as project music' }).click();

  await expect(page.getByText('Music added')).toBeVisible();
  // Background mix: quiet, ducked under voiceovers, cuts aligned to the generated tempo.
  await expect(
    page.getByText(/Background mix at 15%, ducked under voiceovers · cuts aligned to \d+ BPM/),
  ).toBeVisible();
  // The attached track shows in the Project inspector's Music group.
  await page.getByRole('tab', { name: 'Project' }).click();
  const musicSelect = page.locator('select').filter({ hasText: /Generated music/ });
  await expect(musicSelect.locator('option:checked')).toHaveText(
    /Generated music · upbeat hard \d+ BPM\.wav/,
  );
});
