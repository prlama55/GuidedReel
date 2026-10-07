# Project schema

Source of truth: `packages/schema/src/project.ts` (Zod). Types are inferred; never hand-write them.

```jsonc
{
  "schemaVersion": 2,
  "id": "prj_…",
  "name": "Spring launch",
  "revision": 12,
  "format": { "width": 1080, "height": 1920, "fps": 30 },
  "templateId": "modern-promo",
  "brand": {
    "name": "Acme",
    "logoAssetId": "ast_…",
    "colors": { "primary": "#6366F1" },
    "fonts": [],
    "ctaStyle": "solid",
  },
  "scenes": [
    {
      "id": "sc_…",
      "type": "hook",
      "durationInFrames": 120,
      "durationMode": "fixed",
      "audioPaddingFrames": 15,
      "props": {
        "text": "Too much news?",
        "highlightWords": ["news"],
        "size": "lg",
        "animation": "word-by-word",
      },
      "voiceoverAssetId": "ast_…",
      "transitionIn": { "type": "fade", "durationInFrames": 12 },
      "hidden": false,
    },
  ],
  "assets": [
    {
      "id": "ast_…",
      "type": "voiceover",
      "name": "vo1.mp3",
      "source": { "kind": "store", "key": "as_x.mp3" },
      "mimeType": "audio/mpeg",
      "size": 48213,
      "duration": 3.9,
    },
  ],
  "audio": {
    "musicAssetId": null,
    "musicVolume": 0.25,
    "duckMusic": true,
    "voiceoverVolume": 1,
    "fadeOutFrames": 30,
  },
  "settings": {
    "backgroundColor": "#0B0F19",
    "defaultTransition": { "type": "fade", "durationInFrames": 12 },
    "fontFamily": "Inter",
    "safeZones": true,
  },
  "metadata": { "createdAt": "…", "updatedAt": "…", "source": "template", "tags": [] },
}
```

## Rules enforced by the schema

- Unique scene and asset ids.
- Scene `props` validated against the scene type's props schema (issues are reported at `scenes[i].props.<key>`).
- Scene duration ≥ the type's minimum; transition shorter than the scene.
- Every referenced voiceover / music asset exists in `assets`.
- No `startFrame`: positions are derived (see video-engine.md).

## Asset sources

| kind    | meaning                      | used by                                 |
| ------- | ---------------------------- | --------------------------------------- |
| `url`   | http(s) URL                  | any host                                |
| `store` | key in the host's AssetStore | web (IndexedDB), desktop (app data dir) |
| `local` | absolute path                | desktop (files picked in place)         |
| `cloud` | provider/bucket/key          | future Supabase Storage                 |

## Versioning and migrations

`schemaVersion` is an integer. `migrateProjectDocument` applies ordered single-step migrations from `packages/schema/src/migrations.ts` until the document reaches `CURRENT_SCHEMA_VERSION`; `parseProjectDocument` migrates and validates. Documents from a newer app version are rejected with a clear message. When changing the stored shape:

1. Bump `CURRENT_SCHEMA_VERSION`.
2. Add `{ from, to, migrate }` to `MIGRATIONS`.
3. Add a test with a fixture of the old shape.

History: v2 (2026-10-07) replaced Image `props.kenBurns: boolean` with `props.motion` (`none | ken-burns | …`).

## Drafts

`VideoProjectDraft` is the relaxed shape produced by importers and future AI generators (durations in seconds, no ids). `finalizeDraft` fills defaults and validates.

## Portable export

A project exports as `project.json` (Projects page → Export, or File → Export Project on desktop). The future package format (`project.json` + `assets/` + `fonts/` + `previews/`) is typed as `ProjectPackageManifest` in the engine.
