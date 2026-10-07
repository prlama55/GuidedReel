---
name: monorepo-build
description: Use when working on how GuidedReel packages are built, consumed or run in development — tsup/dist pipeline, turbo task graph (^build dependencies, persistent dev watchers, concurrency), pnpm catalog/hoisting, Prettier/ESLint presets, "module not found" or "no declaration file" for @guidedreel/*, Tailwind classes missing from the UI, or dev servers failing to start. Triggers — "pnpm dev:web fails", "persistent tasks concurrency", "dist missing", "tsup", "turbo.json", "catalog:", "node-linker=hoisted", "transpilePackages", "@source".
---

# Monorepo build and dev loop

pnpm 10 workspace + Turborepo. `apps/web` (Next.js 16), `apps/desktop` (Electron 44 via electron-vite 5), `packages/*`. Node ≥ 22. Every third-party version is pinned once in `pnpm-workspace.yaml` under `catalog:`; all `@remotion/*` must share one version.

## Packages compile to `dist/` (since 2026-10-08)

- Each publishable package has `tsup.config.ts` → `libraryConfig()` from `packages/config/tsup/index.js` (ESM, bundled per entry with shared chunks, `.d.ts`, source maps, `clean: true`). `dts` runs with `incremental: false` because the shared tsconfig enables `incremental` and rollup-plugin-dts rejects it.
- `exports` point at `dist/` (`types` + `default`), so apps, Vitest and Remotion's webpack all consume the compiled output. Relative imports inside packages stay extensionless; tsup resolves them.
- `packages/ui` also writes `dist/styles.css` = `@source "./";` + `src/styles.css`, so a consumer's Tailwind v4 scans the compiled components. Apps only `@import "@guidedreel/core/styles.css"` after `@import "tailwindcss"`; no `@source` lines in apps.
- Multi-entry packages: `compositions` (`index`, `metadata`, `entry`), `core` (`index`, `ui`, `render`, `storage`, `providers`).

## Turbo graph (`turbo.json`)

- `build` outputs `dist/**`, `.next/**`, `out/**`, `release/**`, `template/**`.
- `typecheck`, `test`, `test:integration`, `test:e2e`, `dev` all `dependsOn: ["^build"]` — dependencies' `dist` must exist first. Turbo restores cached outputs on a hit.
- `dev` is persistent: `tsup --watch` per package + the app server. `concurrency: "24"` because the default cap (10) rejected the graph ("You have 10 persistent tasks").
- Root scripts: `dev:web` / `dev:desktop` = `turbo run dev --filter=@guidedreel/<app>...`, `build:packages` = `turbo run build --filter='./packages/*'`, `test:integration`, `test:e2e`.

## Gotchas

- **Killing `pnpm dev` mid-rebuild leaves `dist/` without `.d.ts`** (tsup cleans, writes JS, then builds DTS in a worker). Symptom: TS7016 "Could not find a declaration file for '@guidedreel/core'". Fix: `pnpm turbo run build --filter='./packages/*' --force`.
- Hoisted `node_modules` (`.npmrc node-linker=hoisted`) is required for Electron packaging. A broken hoisted tree (e.g. "Cannot find module 'p-try'" from a nested `p-limit`) is fixed by `rm -rf node_modules && pnpm install`.
- `pnpm-workspace.yaml` has `overrides: 'get-stream@5': ^6.0.1` for electron-builder (see [[desktop-packaging]]). Don't remove it.
- `onlyBuiltDependencies` lists packages allowed to run postinstall (electron, esbuild, Remotion compositors, sharp…). A new native dep must be added there.
- Lint preset: `createConfig({ react, node, app })` in `packages/config/eslint/index.js`. `app: true` (both apps) bans `remotion`, `@remotion/*` and any `@guidedreel/*` other than `@guidedreel/core` via `no-restricted-imports`.
- Prettier covers `**/*.md` including `.claude/skills`; `pnpm format:check` runs in CI.

## Commands

`pnpm lint` · `pnpm typecheck` · `pnpm test` (45 turbo tasks) · `pnpm build` · `pnpm format` · `pnpm test:integration` (real MP4, ~7 s after the first browser download) · `pnpm test:e2e` (web Playwright) · `pnpm turbo run test:e2e --filter=@guidedreel/desktop` (needs `pnpm build:desktop`).
