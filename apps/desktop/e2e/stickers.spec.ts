import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// CommonJS package: resolve Electron's binary with require.
const electronPath = require('electron') as unknown as string;

/** Animated stickers decode GIFs in a blob: Web Worker; the renderer CSP must allow it. */
test('desktop: animated emoji sticker renders (CSP allows the GIF worker)', async () => {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [path.resolve(__dirname, '../out/main/index.js')],
    env: { ...process.env, VC_E2E_USER_DATA: mkdtempSync(path.join(os.tmpdir(), 'vc-userdata-')) },
  });
  const page = await app.firstWindow();
  const cspErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy/.test(m.text())) cspErrors.push(m.text());
  });
  const gifLoaded = page.waitForResponse(
    (r) => r.url().includes('notoemoji') && r.url().endsWith('.gif') && r.ok(),
    { timeout: 30_000 },
  );

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Sticker desktop');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Add sticker', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Search stickers').fill('fire');
  await page.getByRole('dialog').getByRole('option', { name: 'Sticker fire', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sticker overlay', exact: true })).toBeVisible();

  await gifLoaded;
  await page.waitForTimeout(1000);
  expect(cspErrors, cspErrors.join('\n')).toEqual([]);
  await app.close();
});
