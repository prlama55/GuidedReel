# Architecture

_Last updated: 2026-10-07_

## Goals

1. One video engine shared by the web app (Next.js) and the desktop app (Electron).
2. A generic `VideoProject` document that any producer can create: the manual editor, a CSV/JSON
   import, a template factory, or (later) an AI content generator. The renderer never knows which.
3. Strict dependency direction: `UI → application services → domain → infrastructure adapters`.
4. Portable, versioned project files with migrations.

## Repository layout

```text
apps/
  web/             Next.js 16 shell: routing, local-first persistence, in-process render worker
  desktop/         Electron shell: main / preload / renderer, native dialogs, local render
packages/
  schema/          Zod schemas + inferred types, format presets, scene definitions, migrations
  engine/          timeline math, durations, project factory, script import, errors, logger, AI seams
  templates/       template registry + template factories (TemplateInput → VideoProject)
  compositions/    Remotion: scenes, transitions, animations, root VideoComposition
  renderer/        VideoRenderer interface, LocalRemotionRenderer, asset server (Node only)
  storage/         ProjectRepository / AssetStore / StorageProvider interfaces + implementations
  ui/              shared editor React components, editor store, PlatformAdapter
  config/          shared tsconfig / eslint presets
```

## Dependency graph

```text
apps/web ───┐
            ├──▶ ui ──▶ compositions ──▶ engine ──▶ schema
apps/desktop┘    │  └──▶ templates ───▶ engine
                 └──▶ storage ─────────▶ engine
apps/* ──▶ renderer ──▶ compositions/metadata (React-free), engine
```

Rules enforced by convention and lint:

- `schema` and `engine` import no React, no Node built-ins, no browser globals.
- `compositions` imports React + Remotion only. No fetch, no storage, no UI libraries.
- `ui` imports nothing from `next/*` or `electron`. Routing and platform features are injected.
- `renderer` is Node-only and is consumed by the web server and the Electron main process. It imports only the React-free `@guidedreel/compositions/metadata` subpath so server bundles never include component code.

## Core document model

```text
VideoProject
  ├─ format          { width, height, fps }  (presets: 9:16, 16:9, 1:1, 4:5)
  ├─ templateId
  ├─ brand?          colours, fonts, logo, watermark
  ├─ assets[]        { id, type, name, source: url | local | store | cloud, duration?, width?, height? }
  ├─ scenes[]        { id, type, durationInFrames, durationMode, props, transitionIn?, voiceoverAssetId? }
  ├─ audio           { musicAssetId?, musicVolume, voiceoverVolume }
  ├─ settings        { backgroundColor, defaultTransition?, fontFamily? }
  └─ metadata        { createdAt, updatedAt, source: manual | template | import | ai, ... }
```

Decisions:

- **Scene start frames are derived, not stored.** `calculateTimeline(project)` produces absolute
  frame ranges from scene order, durations and transition overlaps. Transitions overlap adjacent
  scenes, so total duration = Σ durations − Σ transition durations.
- **`durationMode: "fromAudio"`** lets a voiceover asset drive scene length. Media duration is
  captured at import time and stored on the `Asset`, so the timeline never probes files.
- **Scene definitions live in `schema`**, not in the React layer. Each scene type exports its
  Zod props schema, a defaults factory, default duration, and inspector field metadata. The
  editor's inspector, template factories, CSV import and future AI output all validate against the
  same definition. `compositions` only maps `type → React component`.
- **Asset sources are abstract.** The engine receives an `AssetResolver` that turns a source into
  a URL for the current environment: object URLs in the browser, a custom `vc-asset://` protocol in
  Electron's renderer, and a loopback HTTP asset server during local renders.
- **Templates are factories**, `(TemplateInput) → VideoProject`, with a Zod input schema. A
  template supports several aspect ratios; it is never duplicated per platform.

## Timeline

V1 is a single ordered scene track plus two implicit audio tracks (voiceover per scene, global
music). The `Timeline` type is already shaped as `tracks[] → items[]` so overlay / SFX tracks can be
added without changing consumers.

## Rendering

```text
VideoRenderer.render(project, options, { onProgress, signal })
   └─ LocalRemotionRenderer (Node)
        1. ensure Remotion bundle (prebuilt in production, cached in dev)
        2. start loopback asset server for local/store assets (allowlist by asset id)
        3. selectComposition → renderMedia with progress + cancel
        4. return { outputPath, sizeBytes, durationMs }
```

- Desktop: Electron main spawns a `utilityProcess` running the renderer; progress is streamed to
  the window via IPC.
- Web V1: `POST /api/render` creates a `RenderJob`, an in-process queue runs the same renderer on
  the Next.js server, status is polled via `GET /api/render/:id`. The job model and statuses are
  the production shape; swapping the in-process queue for pg-boss + a Docker worker or Remotion
  Lambda is a Phase 6 infrastructure change, not an engine change.

## Persistence

`ProjectRepository` and `AssetStore` are interfaces. Web V1 ships an IndexedDB implementation
(local-first, no account needed). Desktop ships a filesystem implementation (projects as
`project.json`, assets referenced by path). Supabase implementations slot in behind the same
interfaces when auth is added.

## Future AI seam

```ts
interface VideoContentGenerator {
  generate(input: ContentGenerationInput): Promise<VideoProjectDraft>;
}
```

A draft is a partial project that passes through the same `validateProject` and
`finalizeDraft` functions used by CSV import. Nothing downstream changes.

Text-to-speech is implemented behind `TTSProvider` (`packages/engine/src/extensions.ts`): cloud adapters in `packages/providers` (OpenAI, ElevenLabs, Google; framework-free `fetch`, user-supplied keys) and a local engine on desktop (`apps/desktop/src/main/tts/local-tts.ts`, sherpa-onnx running Piper voices, downloaded on demand). The web app proxies cloud calls through `/api/tts` so keys are never persisted server-side; the desktop keeps keys in the OS keychain via `safeStorage`. The Claude API has no speech or music endpoints, so it is not part of this path; it remains the planned provider for script generation (Phase 8).

Stock GIF/sticker services (GIPHY, Tenor) need API keys and attribution, so V1 ships only the free Noto emoji catalogue and user-uploaded GIFs; a GIPHY or Tenor adapter would implement `StockMediaProvider` and feed the same sticker/media overlay types.

## Technical risks and how they are handled

| Risk                                                        | Mitigation                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Remotion renderer + Chromium inside a packaged Electron app | Render in a child process; `asarUnpack` for `@remotion/*`; prebuilt bundle; spike before the editor is built |
| Serverless web hosting cannot render video                  | Web render runs on a Node server (in-process queue in V1), designed to move to a worker                      |
| Shared UI accidentally depends on Next.js                   | `ui` package has no `next` dependency; lint forbids `next/*` imports                                         |
| Remotion version drift across packages                      | Single version pinned in the pnpm catalog                                                                    |
| Large media in memory                                       | Assets are referenced by URL/path; browser assets stay as Blobs in IndexedDB; thumbnails for UI              |
| Non-Latin scripts (Nepali etc.)                             | Default fonts with wide Unicode coverage; custom font upload via brand kit                                   |
