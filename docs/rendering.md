# Rendering

## Contract

```ts
interface VideoRenderer {
  render(
    project: VideoProject,
    options: RenderOptions,
    callbacks?: { onProgress?; signal? },
  ): Promise<RenderResult>;
}
```

`RenderOptions`: `codec` (h264 default, h265, vp8, vp9, prores), `quality` preset (draft = half resolution CRF 30, standard CRF 20, high CRF 16) or explicit `crf`/`scale`, `muted`, `fileName`, `outputPath`, `concurrency`. Progress reports `status` (`preparing | rendering | encoding | completed`), `progress` 0..1 and frame counts. Cancellation is an `AbortSignal`.

## LocalRemotionRenderer

1. Validates the project and refuses missing assets up front.
2. `ensureBrowser()` and `ensureBundle()` — uses a prebuilt bundle when given one, otherwise builds and caches a webpack bundle of `@guidedreel/compositions/entry`.
3. Checks free disk space against a rough size estimate (`INSUFFICIENT_DISK_SPACE`).
4. Starts a loopback **asset server** exposing only the project's local files (allowlist by asset id, Range support for seeking).
5. `selectComposition` + `renderMedia` with progress mapped to our statuses.
6. Returns `{ outputPath, sizeBytes, durationMs, totalFrames }`; errors become `VideoCreatorError`s (`RENDER_FAILED`, `RENDER_CANCELLED`, `UNSUPPORTED_CODEC`, …).

Integration test: `pnpm --filter @guidedreel/renderer test:integration`.

## Desktop

Electron's main process spawns one `utilityProcess` per job (`render-worker`), so a long render never blocks the UI. Progress messages are forwarded to the window as `render:update` events. The user picks the output file in a native save dialog before the render starts. Production builds ship a prebuilt Remotion bundle in `resources/remotion-bundle`; `@remotion/*` is unpacked from the asar archive so Chromium and the compositor can execute.

## Web (V1)

```text
POST /api/render  (multipart: project JSON, options JSON, one file per `store` asset)
  → validate, size/type checks, rate limit → RenderJob (202)
GET  /api/render           list jobs
GET  /api/render/:id       job status (UI polls every 750 ms)
DELETE /api/render/:id     cancel   (?purge=1 removes job and output)
GET  /api/render/:id/output   download MP4
```

`RenderService` is an in-process queue (`RENDER_CONCURRENCY`) that runs `LocalRemotionRenderer` on the Next.js server. Uploaded assets live in `RENDER_WORK_DIR/jobs/<id>` for the duration of the job and are deleted afterwards. Jobs are kept in memory; restart clears the list (outputs stay on disk).

### Moving to Phase 6 (cloud rendering)

The job model, statuses and routes are already the production shape. To scale out:

- Persist `RenderJob` rows (Postgres `render_jobs`) and enqueue with pg-boss, or call Remotion Lambda.
- Run the worker in a container with `@guidedreel/renderer` and a prebuilt bundle; upload the output to Supabase Storage and set `outputUrl` to a signed URL.
- Replace `getRenderService()` with the queue-backed implementation. `HttpRenderClient` and the UI do not change.

Serverless platforms (Vercel functions) cannot host the render step; the web app itself can run anywhere.
