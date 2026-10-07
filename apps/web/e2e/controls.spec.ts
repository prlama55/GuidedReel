import { expect, test } from '@playwright/test';

test('transport controls: frame step, scene jump, timecode input, speed, split, guides, fit', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Controls');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible();

  const time = page.getByRole('button', { name: 'Current time' });
  await expect(time).toContainText('00:00.20');

  // Frame stepping
  await page.getByRole('button', { name: 'Next frame' }).click();
  await expect(time).toContainText('00:00.21');
  await page.getByRole('button', { name: 'Previous frame' }).click();
  await expect(time).toContainText('00:00.20');

  // Scene jumps: hook is 3.5s → next scene starts at 3.5s minus the 8-frame overlap
  await page.getByRole('button', { name: 'Next scene' }).click();
  await expect(time).toContainText('00:03.07');
  await page.getByRole('button', { name: 'Previous scene' }).click();
  await expect(time).toContainText('00:00.00');

  // Typed timecode
  await time.click();
  await page.getByLabel('Go to time').fill('5');
  await page.keyboard.press('Enter');
  await expect(time).toContainText('00:05.00');
  await time.click();
  await page.getByLabel('Go to time').fill('0:02.10');
  await page.keyboard.press('Enter');
  await expect(time).toContainText('00:02.10');

  // Playback speed
  await page.getByLabel('Playback speed').selectOption('2');
  await expect(page.getByLabel('Playback speed')).toHaveValue('2');

  // Split: refused near the edges (second half would be under the 1.5s minimum) …
  const split = page.getByRole('button', { name: 'Split scene at playhead' });
  await expect(split).toBeDisabled();
  // … allowed in the middle of the 3.5s hook.
  await time.click();
  await page.getByLabel('Go to time').fill('0:01.22');
  await page.keyboard.press('Enter');
  await expect(split).toBeEnabled();
  await split.click();
  await expect(page.getByText(/Scenes · 6/)).toBeVisible();
  await expect(page.getByText('Scene 2 · Hook')).toBeVisible();

  // Guides and fit
  await page.getByRole('button', { name: 'Toggle guides' }).click();
  await expect(page.getByRole('button', { name: 'Toggle guides' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Zoom to fit' }).click();

  // Keyboard: S splits the current scene again; J/K/L shuttle changes speed
  await page
    .locator('body')
    .click({ position: { x: 5, y: 5 } })
    .catch(() => undefined);
  await page.keyboard.press('k');
  await page.keyboard.press('j');
  await expect(page.getByLabel('Playback speed')).toHaveValue('1.5');
  await page.keyboard.press('k');
});
