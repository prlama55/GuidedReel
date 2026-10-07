---
name: desktop-packaging
description: Use when building, packaging or debugging the Electron desktop app — electron-vite build, the prebuilt Remotion bundle, electron-builder (asar, asarUnpack, dependency collection, hoisted node_modules), the packaged app not starting or missing a module, dev app naming on macOS, the app:// asset protocol, utilityProcess render worker, or Playwright e2e for desktop. Triggers — "electron-builder", "app.asar", "Cannot find module" in packaged app, "dist:dir", "packaged.spec", "pump", "get-stream override", "asarUnpack", "dev.mjs", "Electron.app rename", "hiddenInset".
---

# Desktop app (apps/desktop)

electron-vite 5: `src/main` (CJS output, deps externalized), `src/preload`, `src/renderer` (React, Vite, Tailwind). `pnpm build:desktop` = `electron-vite build` + `tsx scripts/build-bundle.ts resources/remotion-bundle` (prebuilt Remotion bundle via `ensureBundle` from `@guidedreel/core/render`, shipped as `extraResources`).

## Runtime shape

- Main externalizes everything (`externalizeDepsPlugin()`); `@guidedreel/core`, `/render`, `/providers` are `require()`d at runtime (ESM dist; Electron 44 ships Node 24). Render jobs run in a `utilityProcess` (`render-manager.ts` forks `out/main/render-worker.js`), progress streamed over IPC.
- Local assets are served via a custom protocol (`protocol.ts`, scheme registered before `app.ready`); never `file://`, `webSecurity` stays on. CSP needs `worker-src 'self' blob:` for GIF decoding.
- `data-vc-titlebar` elements are the drag region for macOS `hiddenInset`.
- Dev (`scripts/dev.mjs`): clones `Electron.app` into `.electron-dev`, rewrites `Info.plist` (name, `com.guidedreel.app.dev`, copyright) so the menu bar says the product name; `VC_DEV_STOCK_ELECTRON=1` skips it. `app-info.ts` holds `APP_NAME`/`APP_COPYRIGHT`.
- E2E hooks: `VC_E2E_OUTPUT_DIR`, `VC_E2E_USER_DATA`, `VC_E2E_TTS`, `VC_E2E_PACKAGED_APP`.

## electron-builder (`electron-builder.yml`) — what bites

- Packs only `dependencies` of `apps/desktop/package.json`, following workspace symlinks. Hence `@guidedreel/core`, `react`, `react-dom`, `zod` are `dependencies`; `@remotion/*` arrive transitively through core. Adding something the main process needs at runtime? Put it in `dependencies`.
- The dependency collector copies the **hoisted top-level copy of each package regardless of version**. A dev-only chain hoisted `get-stream@5` above the `@remotion/renderer → execa → get-stream@6` chain, so the packaged app lacked `pump` and hung at startup (no stderr, no log; Playwright `electron.launch` times out). Fix is `overrides: 'get-stream@5': ^6.0.1` in `pnpm-workspace.yaml`. Any new version split between a prod chain and a hoisted dev copy can reproduce this.
- `asarUnpack`: `**/node_modules/@remotion/**`, `**/node_modules/esbuild/**` (native binaries must live on disk). `npmRebuild: false`. electron-builder ^26.17.
- Packaged `node_modules/@guidedreel/*` also contain `src/` (collector copies package dirs whole); harmless.
- `artifactName: ${productName}-${version}-${os}-${arch}.${ext}` ([[release-publishing]]).

## Verify a package

```bash
pnpm build:desktop
pnpm --filter @guidedreel/desktop exec electron-builder --dir --config electron-builder.yml   # CSC_IDENTITY_AUTO_DISCOVERY=false locally
pnpm --filter @guidedreel/desktop exec playwright test e2e/packaged.spec.ts
```

`packaged.spec.ts` boots `release/mac-<arch>/GuidedReel.app` (or `VC_E2E_PACKAGED_APP`), asserts `app.isPackaged`, waits for the Dashboard, and `require`s `@guidedreel/core/render` from the app path via `process.getBuiltinModule('node:module').createRequire(...)` (plain `require` is undefined in Playwright's evaluate scope). CI runs it on macOS after the `--dir` step. To inspect contents: `node node_modules/@electron/asar/bin/asar.js list <app>/Contents/Resources/app.asar`. **Never run `asar extract-file … package.json` in a source directory** — it writes `package.json` into cwd (this clobbered `apps/desktop/package.json` once).

`export.spec.ts` drives the dev build (`out/main/index.js` with the `electron` binary) through create → export MP4; `tts-local.spec.ts` is skipped unless `VC_E2E_TTS=1`.
