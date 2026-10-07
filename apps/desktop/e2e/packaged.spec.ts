import { _electron as electron, expect, test } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Boots the *packaged* app (electron-builder output), not the dev build. This is the only
 * test that exercises electron-builder's dependency collection: a module missing from the
 * asar archive (for example a mis-hoisted transitive dependency of @remotion/renderer)
 * shows up here as a main-process error and no window.
 *
 * Set VC_E2E_PACKAGED_APP to the executable, or run `electron-builder --dir` first and the
 * default macOS path is used.
 */
const defaultBinary = path.resolve(
  __dirname,
  `../release/mac-${process.arch}/GuidedReel.app/Contents/MacOS/GuidedReel`,
);
const binary =
  process.env['VC_E2E_PACKAGED_APP'] ?? (existsSync(defaultBinary) ? defaultBinary : '');

test.skip(!binary, 'packaged app not found: run electron-builder --dir or set VC_E2E_PACKAGED_APP');

test('packaged app boots, loads @guidedreel/core and shows the dashboard', async () => {
  const app = await electron.launch({
    executablePath: binary,
    args: [],
    env: { ...process.env, VC_E2E_USER_DATA: mkdtempSync(path.join(os.tmpdir(), 'vc-packaged-')) },
    timeout: 60_000,
  });
  const mainOutput: string[] = [];
  app.process().stdout?.on('data', (d) => mainOutput.push(String(d)));
  app.process().stderr?.on('data', (d) => mainOutput.push(String(d)));
  const errors: string[] = [];

  const info = await app.evaluate(({ app: electronApp }) => ({
    packaged: electronApp.isPackaged,
    name: electronApp.getName(),
  }));
  expect(info.packaged).toBe(true);

  const page = await app.firstWindow({ timeout: 60_000 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 });

  // The render manager lives in the main process and loads @guidedreel/core/render on first use.
  // Opening the export path is covered by export.spec.ts; here we only prove the module graph resolves.
  const renderModule = await app.evaluate(({ app: electronApp }) => {
    // Resolve from the packaged app's own package.json (inside app.asar), not from Playwright's context.
    // `require` is not defined in the evaluate scope; Node ≥ 22.3 exposes builtins via process.getBuiltinModule.
    const { createRequire } = process.getBuiltinModule(
      'node:module',
    ) as typeof import('node:module');
    const appRequire = createRequire(`${electronApp.getAppPath()}/package.json`);
    try {
      const mod = appRequire('@guidedreel/core/render') as { LocalRemotionRenderer?: unknown };
      return typeof mod.LocalRemotionRenderer;
    } catch (err) {
      return `error: ${(err as Error).message}`;
    }
  });
  expect(renderModule).toBe('function');

  expect(
    errors,
    `renderer errors:\n${errors.join('\n')}\n\nmain output:\n${mainOutput.join('')}`,
  ).toEqual([]);
  await app.close();
});
