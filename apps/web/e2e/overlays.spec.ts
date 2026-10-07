import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/landscape.svg');

test('add, drag, resize, nudge and delete overlays on a scene', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Overlay test');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible();

  // Add a text overlay from the preview bar; it is selected and the inspector shows it.
  await page.getByRole('button', { name: 'Add text overlay' }).click();
  const textBox = page.getByRole('button', { name: 'Text overlay', exact: true });
  await expect(textBox).toBeVisible();
  await expect(page.getByText('Text overlay', { exact: true })).toBeVisible();
  await page.locator('#overlay-text').fill('Limited offer');
  await expect(textBox).toHaveAttribute('aria-pressed', 'true');

  // The box follows the text: a long paragraph wraps and the box grows with it.
  const oneLine = (await textBox.boundingBox())!;
  await page
    .locator('#overlay-text')
    .fill('A much longer headline that definitely wraps onto several lines inside the overlay box');
  await expect
    .poll(async () => (await textBox.boundingBox())!.height)
    .toBeGreaterThan(oneLine.height * 1.8);
  await page.locator('#overlay-text').fill('Limited offer');
  await expect
    .poll(async () => Math.round((await textBox.boundingBox())!.height))
    .toBe(Math.round(oneLine.height));

  // Drag it up-left; the position sliders follow, and it is a single undo step.
  const b = (await textBox.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 60, b.y + b.height / 2 - 120, { steps: 6 });
  await page.mouse.up();
  const xSlider = page.getByLabel('Horizontal position');
  const ySlider = page.getByLabel('Vertical position');
  await expect(xSlider).not.toHaveValue('0.5');
  await expect(ySlider).not.toHaveValue('0.5');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(xSlider).toHaveValue('0.5');
  await expect(ySlider).toHaveValue('0.5');

  // Arrow keys nudge the selected overlay instead of stepping frames.
  await page
    .locator('body')
    .click({ position: { x: 5, y: 5 } })
    .catch(() => undefined);
  await textBox.click();
  await page.keyboard.press('ArrowRight');
  await expect(xSlider).toHaveValue('0.505');

  // Resize from the corner handle.
  const widthSlider = page.getByLabel('Width', { exact: true });
  const before = Number(await widthSlider.inputValue());
  const handle = page.getByRole('slider', { name: 'Resize overlay' });
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 40, hb.y + 10, { steps: 4 });
  await page.mouse.up();
  expect(Number(await widthSlider.inputValue())).toBeGreaterThan(before);

  // Add a media overlay from a file; it keeps the image's aspect ratio.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add media overlay' }).click();
  await (await chooser).setFiles(fixture);
  const mediaBox = page.getByRole('button', { name: 'Media overlay', exact: true });
  await expect(mediaBox).toBeVisible();
  const mb = (await mediaBox.boundingBox())!;
  expect(mb.width / mb.height).toBeGreaterThan(1.5);

  // Scene inspector lists both; Delete removes the selected overlay.
  await page.keyboard.press('Delete');
  await expect(mediaBox).toBeHidden();
  await expect(textBox).toBeVisible();

  // Persisted after autosave and reload.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Text overlay', exact: true })).toBeVisible();
});
