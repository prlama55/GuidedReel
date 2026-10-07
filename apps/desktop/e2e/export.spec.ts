import { _electron as electron, expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// This package is CommonJS, so `require` is available to resolve Electron's binary path.
const electronPath = require('electron') as unknown as string;
const mainEntry = path.resolve(__dirname, '../out/main/index.js');

test('desktop vertical slice: create project, edit, export MP4', async () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'vc-desktop-e2e-'));
  const app = await electron.launch({
    executablePath: electronPath,
    args: [mainEntry],
    env: {
      ...process.env,
      VC_E2E_OUTPUT_DIR: outDir,
      VC_E2E_USER_DATA: mkdtempSync(path.join(os.tmpdir(), 'vc-userdata-')),
    },
  });
  const errors: string[] = [];
  const mainOutput: string[] = [];
  app.process().stdout?.on('data', (d) => mainOutput.push(String(d)));
  app.process().stderr?.on('data', (d) => mainOutput.push(String(d)));
  const page = await app.firstWindow();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Desktop export');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · /)).toBeVisible({ timeout: 20_000 });

  // Toolbar controls must be clickable (regression: title-bar drag overlay swallowed clicks).
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Start render' }).click();
  await expect(page.getByRole('dialog').getByText(/Your video is ready|Render failed/)).toBeVisible(
    {
      timeout: 240_000,
    },
  );
  const dialogText = await page.getByRole('dialog').innerText();
  if (!dialogText.includes('Your video is ready')) {
    throw new Error(
      `Render did not complete:\n${dialogText}\n--- main process output ---\n${mainOutput.join('').slice(-4000)}`,
    );
  }

  const output = path.join(outDir, 'Desktop export.mp4');
  expect(existsSync(output)).toBe(true);
  expect(statSync(output).size).toBeGreaterThan(10_000);
  expect(errors, errors.join('\n')).toEqual([]);
  await app.close();
});
