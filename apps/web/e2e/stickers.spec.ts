import { expect, test } from '@playwright/test';

test('add an emoji sticker from the picker and see it in the preview and inspector', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Sticker test');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible();

  await page.getByRole('button', { name: 'Add sticker', exact: true }).click();
  const picker = page.getByRole('dialog');
  await expect(picker.getByText('Add a sticker')).toBeVisible();
  await picker.getByLabel('Search stickers').fill('fire');
  await picker.getByRole('option', { name: 'Sticker fire', exact: true }).click();

  const box = page.getByRole('button', { name: 'Sticker overlay', exact: true });
  await expect(box).toBeVisible();
  await expect(page.getByText('Sticker overlay', { exact: true })).toBeVisible();
  await expect(page.getByText('Noto Emoji · 1f525')).toBeVisible();
  // Square box in frame terms
  const b = (await box.boundingBox())!;
  expect(Math.abs(b.width - b.height)).toBeLessThan(3);

  // Switch to static and back; the preview keeps the sticker.
  await page.getByRole('switch', { name: 'Animated sticker', exact: true }).click();
  await expect(page.getByLabel('Sticker speed')).toBeHidden();
  await expect(box).toBeVisible();

  // Back to the scene via the button; the scene's Overlays list shows the sticker by name.
  await page.getByRole('button', { name: 'Back to scene' }).click();
  await expect(page.getByText('Scene 1 · Hook')).toBeVisible();
  const listItem = page.getByRole('button', { name: /Sticker · fire/ });
  await expect(listItem).toBeVisible();

  // Re-select from the list, then Escape returns to the scene; clicking the stage also does.
  await listItem.click();
  await expect(page.getByText('Sticker overlay', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Scene 1 · Hook')).toBeVisible();
  await listItem.click();
  await expect(page.getByText('Sticker overlay', { exact: true })).toBeVisible();
  const stage = page.locator('.bg-stage');
  const sb = (await stage.boundingBox())!;
  await page.mouse.click(sb.x + sb.width / 2, sb.y + 40);
  await expect(page.getByText('Scene 1 · Hook')).toBeVisible();
});
