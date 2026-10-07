import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const electronPath = require('electron') as unknown as string;

/**
 * Installs the local speech engine and a voice (downloads ~100 MB on first run),
 * generates a voiceover for a scene and attaches it. Needs network access.
 */
test('desktop: install a local voice and generate a voiceover', async () => {
  test.skip(
    !process.env.VC_E2E_TTS && !process.env.VC_E2E_TTS_USER_DATA,
    'Downloads ~100 MB; set VC_E2E_TTS=1 to run',
  );
  test.setTimeout(300_000);
  const app = await electron.launch({
    executablePath: electronPath,
    args: [path.resolve(__dirname, '../out/main/index.js')],
    env: {
      ...process.env,
      VC_E2E_USER_DATA:
        process.env.VC_E2E_TTS_USER_DATA ?? mkdtempSync(path.join(os.tmpdir(), 'vc-userdata-')),
    },
  });
  const page = await app.firstWindow();
  page.on('dialog', (d) => void d.dismiss().catch(() => undefined));
  const step = (name: string) => console.log(`[step] ${name}`);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 });
  step('dashboard');

  // Settings → Local voices → install Lessac (engine + voice)
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('Local voices (free, offline)')).toBeVisible();
  const row = page.locator('li').filter({ hasText: 'Lessac' });
  if (await row.getByRole('button', { name: /Install/ }).isVisible()) {
    await row.getByRole('button', { name: /Install/ }).click();
    await expect(row.getByText('Installed')).toBeVisible({ timeout: 540_000 });
  }

  step('voice installed');
  // New project → scene → Generate voiceover with the local provider
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('button', { name: 'New project' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('e.g. Spring launch promo').fill('Local voice');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /9:16/ }).click();
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await dialog.getByRole('button', { name: /Social Reel/ }).click();
  await dialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText(/Scenes · 5/)).toBeVisible({ timeout: 20_000 });

  step('project created');
  await page.getByRole('button', { name: 'Generate voiceover' }).click();
  const vo = page.getByRole('dialog');
  await vo.getByLabel('Provider', { exact: true }).selectOption('local');
  await vo.getByLabel('Voice', { exact: true }).selectOption('en_US-lessac-medium');
  await vo.getByRole('button', { name: 'Generate', exact: true }).click();
  step('generate clicked');
  await expect(vo.getByLabel('Preview voiceover')).toBeVisible({ timeout: 120_000 });
  step('preview ready');
  await vo.getByRole('button', { name: 'Use for this scene' }).click();
  step('use clicked');
  await expect(page.getByText('Voiceover attached')).toBeVisible({ timeout: 30_000 });
  step('attached toast');
  await expect(page.locator('select').filter({ hasText: /Voiceover .*Lessac/ })).toBeVisible();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
  step('saved');
  await app.close();
});
