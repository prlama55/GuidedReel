import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('upload media, crop with drag and zoom, stop and loop-scene controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Crop test');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Modern Promotional/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 8/)).toBeVisible();

  // Crop is unavailable until the selected scene has media.
  const crop = page.getByRole('button', { name: 'Crop and reposition media' });
  await page.getByText('Feature 1').first().click();
  await expect(crop).toBeDisabled();

  // Upload an image from the inspector's media field and assign it to Feature 1.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload', exact: true }).first().click();
  await (
    await chooser
  ).setFiles(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/landscape.svg'));
  await expect(page.getByText(/Added landscape\.svg/)).toBeVisible();
  // Uploading primary media opens Crop mode immediately.
  await expect(crop).toBeEnabled();
  await expect(crop).toHaveAttribute('aria-pressed', 'true');

  // Crop mode: drag to reposition and zoom in.
  const overlay = page.getByRole('application', { name: /Crop media/ });
  await expect(overlay).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in media' }).click();
  await expect(page.getByTestId('crop-zoom')).toHaveText('1.25×');
  const box = (await overlay.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const offsetX = page.getByLabel('Horizontal position');
  await expect(offsetX).not.toHaveValue('0');
  // The drag is a single undo step.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(offsetX).toHaveValue('0');
  await expect(page.getByTestId('crop-zoom')).toHaveText('1.25×');
  await overlay.dblclick();
  await expect(page.getByTestId('crop-zoom')).toHaveText('1.00×');

  // Playback controls: play, stop returns to the start, loop-scene toggles.
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(600);
  // While playing the same button shows Stop; stopping keeps the current timestamp.
  const stopBtn = page.getByRole('button', { name: 'Stop', exact: true });
  await expect(stopBtn).toBeVisible();
  await stopBtn.click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Current time' })).not.toContainText('00:00.00 /');
  // Crop can be reopened from the inspector's media field.
  await crop.click();
  await expect(overlay).toBeHidden();
  await page.getByRole('button', { name: 'Crop and reposition', exact: true }).click();
  await expect(overlay).toBeVisible();
  const loopScene = page.getByRole('button', { name: 'Play selected scene only' });
  await loopScene.click();
  await expect(loopScene).toHaveAttribute('aria-pressed', 'true');
});
