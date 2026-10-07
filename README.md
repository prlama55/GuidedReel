# GuidedReel

**Turn a script and a few assets into a finished video, in the browser or on your desktop.** Developed by [Padma Raj Lama](https://github.com/prlama55).

GuidedReel is an open source video creation tool built on [Remotion](https://remotion.dev). You write (or paste) a script, pick a format and a template, drop in your images, clips, voiceover and music, adjust the timing, and export an MP4. One shared video engine powers both a **Next.js web app** and an **Electron desktop app** for macOS, Windows and Linux.

No AI is involved in the first version. Every word and picture is yours.

[![CI](https://github.com/prlama55/GuidedReel/actions/workflows/ci.yml/badge.svg)](https://github.com/prlama55/GuidedReel/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Remotion](https://img.shields.io/badge/Remotion-4.0-blue)](https://remotion.dev)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

## Examples

Rendered by the app from its own templates. Click a GIF for the MP4. More in [docs/examples](docs/examples/README.md).

<table>
  <tr>
    <td align="center" valign="top">
      <a href="docs/examples/modern-promo.mp4"><img src="docs/examples/modern-promo.gif" width="200" alt="Modern Promotional template, 9:16"></a><br>
      <sub><b>Modern Promotional</b> · 9:16</sub>
    </td>
    <td align="center" valign="top">
      <a href="docs/examples/photo-story.mp4"><img src="docs/examples/photo-story.gif" width="240" alt="Photo story with overlays and stickers, 4:5"></a><br>
      <sub><b>Photo story</b> with overlays · 4:5</sub>
    </td>
    <td align="center" valign="top">
      <a href="docs/examples/social-reel.mp4"><img src="docs/examples/social-reel.gif" width="260" alt="Social Reel template, 1:1"></a><br>
      <sub><b>Social Reel</b> · 1:1</sub>
    </td>
  </tr>
  <tr>
    <td align="center" valign="top" colspan="3">
      <a href="docs/examples/product-ad.mp4"><img src="docs/examples/product-ad.gif" width="480" alt="Product Advertisement template, 16:9"></a><br>
      <sub><b>Product Advertisement</b> · 16:9</sub>
    </td>
  </tr>
</table>

## Features

- **Formats**: 9:16, 16:9, 1:1 and 4:5 from one project. Switch any time; scenes and media adapt.
- **Templates**: Modern Promotional, Product Advertisement, Social Reel, Blank. Each opens with real sample content.
- **Ten scene types**: hook, intro, text, image, video, feature, product, quote, call to action, outro. Each is responsive and brand-aware.
- **Script-first editing**: one text block per scene. Paste a plain script, JSON or CSV and get scenes.
- **Media that fits**: auto fit with a blurred backdrop, cover or contain, and a crop mode with zoom and pan that opens right after you assign media.
- **Overlays**: draggable text, media cards and over six hundred animated Noto emoji stickers, each with entrance, exit and loop animations.
- **Fourteen transitions** and a catalogue of enter, exit, loop and image motion animations.
- **Audio**: record a voiceover in the editor, generate one with offline Piper voices on desktop or OpenAI, ElevenLabs and Google voices with your own key, and generate background music from the scene structure with mood, energy, mix and beat-aligned cuts.
- **Brand kit**: colours, fonts (incl. Devanagari and CJK coverage), logo, watermark, button style.
- **Editor fundamentals**: undo and redo, autosave, keyboard shortcuts, problems list, safe-zone overlay, live Remotion preview.
- **Export**: H.264, H.265, VP9 or ProRes, three quality presets, progress and a render queue. Local rendering on desktop, server rendering on the web.
- **Portable projects**: export and import `project.json` between web and desktop. Versioned schema with migrations.

## Download the desktop app

No developer tools needed. One command downloads the latest installer from [Releases](https://github.com/prlama55/GuidedReel/releases) and installs it.

macOS and Linux:

```bash
curl -fsSL https://github.com/prlama55/GuidedReel/raw/main/scripts/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://github.com/prlama55/GuidedReel/raw/main/scripts/install.ps1 | iex
```

Or pick a file on the Releases page yourself: `.dmg` for macOS, `.exe` for Windows, `.AppImage` or `.deb` for Linux. Beta builds are not code-signed yet, so the first launch shows a security prompt; the scripts explain what to click. Options such as `--version v0.2.0`, `--deb` or `--no-open` are listed at the top of each script.

## Quick start

Requirements: Node 22+, pnpm 10 (`corepack enable`).

Build your own product on the engine without cloning it. The scaffolder creates a web app, a desktop app or both on top of `@guidedreel/core`, with a `packages/extensions` workspace where you register your own templates (add `--fork` to copy the whole engine monorepo instead):

```bash
pnpm create guidedreel my-studio      # or: npx create-guidedreel@latest my-studio
cd my-studio
pnpm dev:web
```

See [packages/create-guidedreel](packages/create-guidedreel/README.md) for all options.

To work on GuidedReel itself:

```bash
git clone https://github.com/prlama55/GuidedReel.git
cd GuidedReel
pnpm install
pnpm dev:web        # http://localhost:3000
pnpm dev:desktop    # Electron with hot reload
```

The first render downloads Remotion's headless browser (about 150 MB) once.

Desktop installers:

```bash
pnpm build:desktop
pnpm --filter @guidedreel/desktop dist:mac      # .dmg
pnpm --filter @guidedreel/desktop dist:win      # .exe
pnpm --filter @guidedreel/desktop dist:linux    # .AppImage + .deb
```

## Documentation

**Using the app**: the [User guide](docs/user-guide/README.md) covers [getting started](docs/user-guide/getting-started.md), [the editor](docs/user-guide/editor.md), [scenes, templates and scripts](docs/user-guide/scenes.md), [media, overlays and brand kit](docs/user-guide/media.md), [audio](docs/user-guide/audio.md), [export](docs/user-guide/export.md), [the desktop app](docs/user-guide/desktop.md) and [troubleshooting](docs/user-guide/troubleshooting.md).

**Working with AI tools**: `.claude/skills/` holds focused guides (build pipeline, core package, releases, scaffolder, desktop packaging, scenes and templates, rendering) that Claude Code loads on demand; `AGENTS.md` carries Turborepo's agent rules.

**Building on it**: [Architecture](docs/architecture.md) · [Development](docs/development.md) · [Video engine](docs/video-engine.md) · [Scene system](docs/scene-system.md) · [Template system](docs/template-system.md) · [Project schema](docs/project-schema.md) · [Rendering](docs/rendering.md) · [Desktop](docs/desktop.md) · [Web](docs/web.md) · [UI / UX](docs/ui-ux.md) · [Deployment](docs/deployment.md) · [Contributing](docs/contributing.md)

## How it is built

```text
Project → Scenes → Assets → Timeline → Template → Remotion Composition → Renderer → MP4
```

```text
apps/web               Next.js 16 shell (local-first, in-process render worker)
apps/desktop           Electron 44 shell (local storage, local rendering, installers)
packages/core          the one package apps depend on: schema + engine + templates, plus /ui, /render, /storage, /providers
packages/schema        Zod schemas + types, format presets, scene definitions, migrations
packages/engine        timeline, durations, project factory, script import, music planner, errors, logger
packages/templates     template registry + Modern Promotional, Product Advertisement, Social Reel, Blank
packages/compositions  Remotion scenes, transitions, animations, overlays, root composition
packages/renderer      VideoRenderer interface + LocalRemotionRenderer (Node)
packages/providers     text-to-speech providers (OpenAI, ElevenLabs, Google) + local voice catalogue
packages/storage       ProjectRepository / AssetStore interfaces + IndexedDB and memory implementations
packages/ui            shared editor UI (React), editor store, PlatformAdapter, pages
packages/config        shared tsconfig / eslint / tsup presets
packages/create-guidedreel  `pnpm create guidedreel` scaffolder
```

Every package is compiled to `dist/` and published to npm under one shared version. To build your own app on the engine:

```bash
pnpm add @guidedreel/core react react-dom
```

```ts
import { createProject, validateProject, templateRegistry } from '@guidedreel/core';
import { AppRouter } from '@guidedreel/core/ui'; // React editor
import { LocalRemotionRenderer } from '@guidedreel/core/render'; // Node only
```

The web and desktop apps are thin shells. Everything that makes a video lives in shared packages, and the core packages depend on neither Next.js, Electron nor any storage vendor. An explicit extension point (`VideoContentGenerator`) lets a future AI step produce the same project document the editor and renderer already understand, without touching them.

## Packages on npm

Every package under `packages/` is published with one shared version, managed with [Changesets](.changeset/README.md): `@guidedreel/core` (the one apps depend on), `schema`, `engine`, `templates`, `compositions`, `renderer`, `providers`, `storage`, `ui`, `config`, and the `create-guidedreel` scaffolder. Apps never list Remotion; it arrives through core. The release flow (version PR, npm provenance, `NPM_TOKEN`) is described in [docs/development.md](docs/development.md#publishing-to-npm).

## Common commands

| Command                                                | What it does                                    |
| ------------------------------------------------------ | ----------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`           | Run across every package via Turborepo          |
| `pnpm test:integration`                                | Real Project → MP4 render test                  |
| `pnpm --filter @guidedreel/renderer examples`          | Re-render the example videos in `docs/examples` |
| `pnpm --filter @guidedreel/compositions studio`        | Open Remotion Studio for the scenes             |
| `pnpm build:packages`                                  | Compile every package to `dist/` (tsup)         |
| `pnpm changeset` / `pnpm version-packages`             | Record a change / apply pending changesets      |
| `pnpm build:web`                                       | Production Next.js build                        |
| `pnpm build:desktop`                                   | Electron bundles + prebuilt Remotion bundle     |
| `pnpm test:e2e`                                        | Playwright tests of the web app                 |
| `pnpm turbo run test:e2e --filter=@guidedreel/desktop` | Playwright tests of the built Electron app      |

## Deployment

The web app needs a long-running Node server for rendering (Docker on a VM, Fly.io, Railway or similar). Vercel can host the UI but not the renderer; pair it with Remotion Lambda instead. Details and a Dockerfile in [docs/deployment.md](docs/deployment.md).

## Status

Beta. The vertical slice works end to end on web and desktop: create project → format → template → scenes, script and assets → preview → render → MP4. Designed for but not yet implemented: cloud render workers, Supabase persistence and auth, speech-to-text captions, AI script generation. Issues and pull requests are welcome; see [docs/contributing.md](docs/contributing.md).

## Author

Developed and maintained by **Padma Raj Lama** ([@prlama55](https://github.com/prlama55)) as a solo open source project. Bug reports and feature requests: [GitHub Issues](https://github.com/prlama55/GuidedReel/issues).

## License

The application code is released under the [MIT License](LICENSE).

It is built on Remotion, which has its own licence: free for individuals, non-profits and companies with up to three people; larger companies need a [Remotion company licence](https://www.remotion.dev/license). Optional downloads on the desktop app (sherpa-onnx, Piper voices) and the Noto Emoji stickers have their own open licences, listed in [LICENSE](LICENSE).
