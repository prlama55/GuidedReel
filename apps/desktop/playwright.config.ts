import { defineConfig } from '@playwright/test';

/** Drives the built Electron app (run `pnpm build` first). */
export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  workers: 1,
  use: { trace: 'on-first-retry' },
});
