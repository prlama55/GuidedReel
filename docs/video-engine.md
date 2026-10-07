# Video engine

The engine is the set of framework-free packages `schema`, `engine`, `templates`, `compositions` and `renderer`. Neither Next.js nor Electron appears anywhere in them.

## Conceptual API

| Need                   | Function                                                                          | Package      |
| ---------------------- | --------------------------------------------------------------------------------- | ------------ |
| Create a project       | `createProject`, `createScene`, `finalizeDraft`                                   | engine       |
| Validate               | `validateProject`, `parseProjectDocument` (migrates first)                        | schema       |
| Derive timing          | `calculateTimeline(project)` → tracks, scene ranges, total frames                 | engine       |
| Edit                   | `addScene`, `moveScene`, `setSceneDuration`, `updateSceneProps`, `removeAsset`, … | engine       |
| Import scripts         | `parseScriptText`, `parseScriptJson`, `parseScriptCsv` → `VideoProjectDraft`      | engine       |
| Instantiate a template | `templateRegistry.instantiate(id, input, ctx)`                                    | templates    |
| Compose                | `<VideoComposition project assetUrls />`, `computeCompositionMetadata`            | compositions |
| Render                 | `new LocalRemotionRenderer(opts).render(project, options, callbacks)`             | renderer     |

## Timing model

Frames are the unit of truth. Seconds appear only at the edges (CSV, inspector) and are converted with the project's fps.

- Scenes store `durationInFrames` and `durationMode`. `fromAudio` makes the voiceover asset's recorded `duration` drive the scene length (plus `audioPaddingFrames`).
- Start frames are **derived**: `calculateTimeline` lays scenes out in order, overlapping each by its `transitionIn` duration. Total length is Σ durations − Σ transition overlaps. The composition uses `@remotion/transitions`' `TransitionSeries`, which applies the same arithmetic, so preview, timeline UI and render agree by construction.
- Hidden scenes are skipped. Transition on the first scene is ignored for positioning.
- Tracks: `scenes`, `voiceover` (one item per scene with a voiceover) and `music` (one looping item). Additional track kinds (`overlay`, `sfx`) are reserved in the type.

## Assets

The engine never opens files. `Asset.source` is a discriminated union (`url`, `local`, `store`, `cloud`). An `AssetResolver` provided by the host turns an asset into a URL for the current environment, and the composition receives `assetUrls: Record<assetId, url>`. Media `duration`, `width` and `height` are captured at import time and stored on the asset.

## Errors and logging

`VideoCreatorError` carries a `code` (`MISSING_ASSET`, `INVALID_DURATION`, `RENDER_CANCELLED`, `INSUFFICIENT_DISK_SPACE`, …) and serialisable `details`. `toVideoCreatorError` maps common Node/FFmpeg failures onto codes. `createLogger(name, { level, sink })` returns a leveled logger; sinks exist for console (dev), JSON lines (servers) and files (desktop).

## Extension points (not implemented in V1)

`VideoContentGenerator`, `ImageProvider`, `VideoProvider`, `AudioProvider`, `TTSProvider`, `StockMediaProvider` in `packages/engine/src/extensions.ts`. A generator returns a `VideoProjectDraft`; `finalizeDraft` turns it into a project exactly like the CSV importer does.

## Audio tooling

- `packages/ui/src/audio/wav.ts`: decode, silence trim, peak normalise and 16-bit WAV encoding for recordings and generated music (browser + Electron).
- `packages/engine/src/music/plan.ts`: `planMusic(project)` → mood, tempo, key, chord progression and per-scene intensity sections, deterministic per project (seed from the project id).
- `packages/ui/src/audio/synth.ts`: `renderMusic(plan)` renders the plan offline with Web Audio (pad, bass, drums, arpeggio layered by intensity) to a WAV that becomes an ordinary music asset.
- `packages/engine/src/music/beat.ts`: `alignScenesToBeat(project, bpm)` snaps scene advances to beats or bars, respecting minimums and audio-driven scenes.
- `packages/engine/src/music/bpm.ts`: `detectBpm(samples, sampleRate)` onset-envelope autocorrelation with harmonic-aware confidence.
