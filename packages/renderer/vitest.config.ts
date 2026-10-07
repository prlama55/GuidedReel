import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], testTimeout: 600_000, hookTimeout: 600_000 },
});
