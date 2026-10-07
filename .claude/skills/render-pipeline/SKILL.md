---
name: render-pipeline
description: Use when debugging or extending video rendering — LocalRemotionRenderer, ensureBundle / the Remotion webpack bundle and its entry resolution, prebuilt bundles, the web render queue (POST /api/render, RenderService, statuses), the desktop render worker, render progress, output codecs/quality presets, the renderer integration test, or "bundle entry not found" / "compositor" errors. Triggers — "render failed", "ensureBundle", "remotion-bundle", "compositions/entry", "RenderService", "/api/render", "render-worker", "renderMedia", "integration test", "ffmpeg filter missing".
---

# Rendering

`packages/renderer` (Node only; `@guidedreel/core/render`). Interface `VideoRenderer.render(project, options) → RenderResult` in `src/types.ts`; implementation `LocalRemotionRenderer` (`src/local-renderer.ts`); helpers `src/bundle.ts` (`ensureBundle`, `compositionsEntryPoint`, `webpackOverride`), `src/asset-server.ts` (serves local assets to headless Chrome), `src/disk.ts`, `src/mime.ts`.

## Bundle

- Entry: `require.resolve('@guidedreel/compositions/entry')` → `packages/compositions/dist/entry.js` (compiled; webpack bundles it with `remotion`, `react`, `@guidedreel/engine`…). The resolve must run in real Node, not a server bundle — hence Next's `serverExternalPackages` ([[core-package]]).
- `ensureBundle({ outDir, entryPoint?, prebuiltDir?, force?, onProgress })`: reuses a cached bundle via `bundle-stamp.json`, or the prebuilt dir (desktop ships `resources/remotion-bundle`). Default dirs: `os.tmpdir()/guidedreel/{remotion-bundle,renders}`; desktop uses `userData/remotion-bundle`.
- Metadata (`COMPOSITION_ID`, `computeCompositionMetadata`) comes from the React-free `@guidedreel/compositions/metadata` subpath so servers never import component code.

## Web (apps/web)

`POST /api/render` validates with `RenderOptionsSchema` + `validateProject`, checks `missingAssetIds`, then `RenderService` (`src/server/render-service.ts`, singleton via `getRenderService()`) runs an in-process queue: statuses queued → preparing → rendering → encoding → uploading → completed | failed | cancelled (`TERMINAL_RENDER_STATUSES`). `GET /api/render/[id]` polls (`pollingSubscribe` in ui), `GET /api/render/[id]/output` streams the MP4. Output dir / limits from `src/server/env.ts` (`.env.example`); rate limiting in `rate-limit.ts`. V1 is local-first; Supabase/pg-boss workers are the Phase 6 adapters.

## Desktop

`render-manager.ts` forks `render-worker.js` as a `utilityProcess` per job and relays progress to the window (`render:update`). The worker constructs `LocalRemotionRenderer` with the prebuilt bundle (`process.resourcesPath/remotion-bundle` when packaged). Export dialog → native save dialog → "Open" / "Reveal in Finder".

## Testing

- `pnpm test:integration` → `packages/renderer/src/render.integration.test.ts` renders the sample project to MP4 (~7 s warm; first run downloads Chrome ~150 MB). CI job `render-integration` installs Chrome libs on Ubuntu.
- `pnpm --filter @guidedreel/renderer examples` re-renders `docs/examples` (half-res MP4 + 12 fps GIF + poster) via `scripts/render-examples.ts`.
- Remotion's bundled ffmpeg lacks `fps` and `hstack` filters; use `-r` for GIF frame rate.
