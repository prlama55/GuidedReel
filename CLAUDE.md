# Build a Production-Ready Cross-Platform Video Creator Platform

## 1. Role

You are a senior staff-level software architect and full-stack engineer.

Build a production-quality, scalable, maintainable video creation application that works as:

1. A web application
2. A desktop application for:

   - macOS
   - Windows
   - Linux/Ubuntu

The application must share as much code as reasonably possible between web and desktop.

The first version must NOT use AI.

The user manually provides:

- scripts
- images
- videos
- audio
- voiceovers
- music
- logos
- fonts
- other required assets

The application uses those inputs to create professional videos using reusable templates and scenes.

AI integration will be added later, so the architecture MUST be designed to support AI in future without requiring a major rewrite.

---

# 2. Product Vision

Build a generic video creation engine that can eventually create:

- Promotional videos
- Advertisements
- Instagram Reels
- YouTube Shorts
- TikTok videos
- Instagram Stories
- Facebook Stories
- Product demonstrations
- Feature videos
- Educational videos
- News videos
- Event videos
- Announcements
- Testimonials
- Explainer videos
- Social media videos

Do NOT hardcode the application around one video type.

The core concept should be:

```text
Project
  ↓
Scenes
  ↓
Assets
  ↓
Timeline
  ↓
Template
  ↓
Remotion Composition
  ↓
Renderer
  ↓
Video
```

---

# 3. Critical Architectural Requirement

The most important requirement is:

## Separate the video engine from the UI.

The web application and desktop application should NOT contain separate video-generation logic.

Both should consume the same shared core packages.

Target architecture:

```text
video-creator/
│
├── apps/
│   ├── web/            Next.js application (thin shell)
│   └── desktop/        Electron application (thin shell)
│
├── packages/
│   ├── schema/         Zod schemas, inferred types, format presets,
│   │                   scene definitions (props schema + defaults +
│   │                   inspector metadata), migrations
│   ├── engine/         timeline calculation, durations, project factory,
│   │                   script import (text/JSON/CSV), asset resolution,
│   │                   structured errors, logger, AI extension interfaces
│   ├── templates/      template registry + template factories
│   ├── compositions/   Remotion code: scenes, transitions, animations,
│   │                   the root VideoComposition (one webpack bundle)
│   ├── renderer/       VideoRenderer interface + LocalRemotionRenderer
│   ├── storage/        StorageProvider / ProjectRepository / AssetStore
│   │                   interfaces + IndexedDB, memory, filesystem impls
│   ├── ui/             shared editor React components + editor store
│   └── config/         shared tsconfig / eslint / prettier presets
│
├── docs/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Package consolidation decision (2026-10-07): the original list of 13
packages was merged into 8. `types` + `validation` → `schema` (types are
inferred from Zod). `core` + `timeline` + `assets` → `engine`.
`remotion` + `scenes` → `compositions` (they must share one Remotion bundle).
Split a package only when a real boundary appears.

Dependency graph (arrows point at dependencies):

```text
apps/web, apps/desktop → ui → compositions → templates → engine → schema
                        ui → storage → engine
                        apps/* → renderer → compositions, engine
```

`schema` and `engine` have no React or Node-only dependencies.

Use a monorepo.

Recommended tooling:

- pnpm
- Turborepo
- TypeScript
- ESLint
- Prettier
- Vitest
- Playwright

---

# 4. Recommended Technology Stack

## Frontend

Use:

- React
- TypeScript
- Next.js for web
- Tailwind CSS
- shadcn/ui (Radix primitives) as the component system
- lucide-react for icons
- Zustand (+ Immer, + undo/redo history middleware) for editor state
- react-resizable-panels for the editor layout
- dnd-kit for drag-and-drop (scene reorder, asset drop)
- @remotion/player for interactive preview

The shared UI lives in `packages/ui` and must be plain React:

- NO imports from `next/*` (no `next/link`, `next/image`, `next/router`, server components)
- NO imports from `electron`
- Routing, data fetching and platform features are injected by the host app

Both `apps/web` and `apps/desktop` are thin shells around the same editor.

## Desktop

Use:

- Electron
- React
- TypeScript

Prefer the same React components used by the web application wherever practical.

The Electron application should have:

```text
Electron Main Process
        ↓
Preload / IPC
        ↓
React Renderer
        ↓
Shared UI
        ↓
Shared Video Engine
```

Do NOT expose unrestricted Node.js APIs directly to the renderer.

Use a secure preload/IPC architecture.

---

# 5. Video Engine

Use Remotion as the video composition/rendering framework.

The video engine must be independent from Next.js and Electron.

It should be possible to call the engine from either environment.

Example conceptual API:

```ts
createVideoProject(...)
validateVideoProject(...)
calculateTimeline(...)
createComposition(...)
renderVideo(...)
```

Do not tightly couple these APIs to HTTP, Electron IPC, Supabase, or any particular UI.

---

# 6. Generic Video Project Model

Design a robust TypeScript schema.

Example conceptual model:

```ts
type VideoProject = {
  id: string;
  name: string;

  version: number;

  format: VideoFormat;

  templateId: string;

  brand?: BrandConfig;

  scenes: VideoScene[];

  globalAssets?: Asset[];

  settings: VideoSettings;

  metadata?: ProjectMetadata;
};
```

Video format should support:

```ts
type VideoFormat = {
  width: number;
  height: number;
  fps: number;
  duration?: number;
};
```

Provide presets:

```text
9:16
1080x1920

16:9
1920x1080

1:1
1080x1080

4:5
1080x1350
```

Do not hardcode platform-specific logic into the core engine.

Create reusable format presets.

---

# 7. Scene Model

Create a generic scene architecture.

Example:

```ts
type VideoScene = {
  id: string;

  type: SceneType;

  // Duration is the only stored timing value. `startFrame` is DERIVED by
  // calculateTimeline() from scene order, durations and transition overlaps.
  // Storing it caused drift on reorder, so it is intentionally absent.
  durationInFrames: number;

  // "fixed"     → durationInFrames is authoritative
  // "fromAudio" → duration follows the scene's voiceover asset (+ padding)
  durationMode: 'fixed' | 'fromAudio';

  props: Record<string, unknown>; // validated by the scene type's propsSchema

  assets?: string[];

  // Transition INTO this scene from the previous one. Transitions overlap
  // the two scenes, so they shorten total duration (handled by the timeline).
  transitionIn?: TransitionConfig;
};
```

Transitions are implemented with `@remotion/transitions` (`TransitionSeries`)
wrapped behind our own `TransitionConfig` type.

Scene types should eventually support:

```text
intro
hook
text
image
video
feature
product
testimonial
quote
statistics
comparison
list
news
chart
logo
cta
outro
custom
```

Do not implement every scene initially.

Implement a clean extensible architecture and several high-quality basic scenes.

---

# 8. Initial Scene Components

Implement at least:

1. IntroScene
2. HookScene
3. TextScene
4. ImageScene
5. VideoScene
6. FeatureScene
7. ProductScene
8. QuoteScene
9. CTA Scene
10. OutroScene

Each scene should be:

- reusable
- independently testable
- configurable
- responsive to video dimensions
- independent from application UI

---

# 9. Transition System

Create a reusable transition abstraction.

Initial transitions:

- none
- fade
- slide-left
- slide-right
- slide-up
- slide-down
- zoom
- wipe

Do not hardcode transitions into individual scenes.

Use something similar to:

```ts
type TransitionConfig = {
  type: TransitionType;
  durationInFrames: number;
  direction?: string;
};
```

---

# 10. Animation System

Create reusable animation utilities.

Examples:

```text
fadeIn
fadeOut
slideIn
slideOut
scaleIn
scaleOut
zoom
kenBurns
blurIn
typewriter
wordHighlight
```

These should be usable by multiple scenes.

---

# 11. Asset System

Create a generic asset model.

```ts
type Asset = {
  id: string;

  type: 'image' | 'video' | 'audio' | 'voiceover' | 'music' | 'font' | 'logo';

  name: string;

  source: AssetSource;

  duration?: number;

  metadata?: Record<string, unknown>;
};
```

The source must support both:

```text
local filesystem
remote URL
cloud storage
```

Do NOT make the video engine dependent on Supabase Storage.

The engine should receive an abstract asset source.

---

# 12. Storage Abstraction

Create:

```ts
interface StorageProvider {
  upload(...): Promise<...>;
  download(...): Promise<...>;
  delete(...): Promise<...>;
  getUrl(...): Promise<...>;
}
```

Implement providers later.

Initial providers:

### Web

Supabase Storage.

### Desktop

Local filesystem.

The core engine should not care which storage provider is being used.

---

# 13. Script System

The first version should allow users to manually provide scripts.

Support:

### Text editor

Users can write:

```text
Too much news, no time to read?

Meet Ajako Taja.

AI-powered trending stories...
```

### JSON

Support importing structured JSON.

### CSV

Support importing:

```text
order,script,media,voice,duration
1,"Too much news?","intro.mp4","voice1.mp3",4
2,"Meet Ajako Taja","feature.jpg","voice2.mp3",5
```

### Future

Design the system so an AI provider can later convert natural language into the same internal project schema.

The renderer should never care whether the project was created manually or by AI.

---

# 14. Timeline

Build a reusable timeline model.

The timeline must support:

- scenes
- tracks
- start time
- duration
- assets
- audio
- transitions
- overlapping elements

Start with a simple scene-based timeline.

Do not build an unnecessarily complicated professional NLE editor in V1.

Architecture should allow future expansion.

Potential future tracks:

```text
Video Track
Overlay Track
Text Track
Voice Track
Music Track
SFX Track
```

---

# 15. Web Application & UI/UX

## 15.1 Application pages

```text
Dashboard        recent projects, quick start from template, render status
Projects         list / search / duplicate / delete / import project.json
Templates        gallery with hover preview, format badges, "Use template"
Assets           library grid, upload, filter by type, usage count
Editor           the main workspace (see layout)
Render Queue     all render jobs with status, progress, download/reveal
Settings         profile, defaults (format, fps, quality), brand kits
```

New project flow (3 steps, one dialog):

```text
Name → Format (9:16 / 16:9 / 1:1 / 4:5) → Template → Open editor
```

## 15.2 Editor layout

Use the standard editor layout. The inspector is on the RIGHT (contextual to
the current selection, needs vertical room), the timeline is at the bottom.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Toolbar: ← Back | Project name | Saved ● | Undo Redo | Format ▾ | Export │
├────┬─────────────────┬─────────────────────────────┬─────────────────┤
│Rail│ Left Panel      │                             │ Inspector       │
│    │                 │                             │                 │
│ ▣  │ Scenes          │        Preview Stage        │ Content         │
│ ✎  │ Script          │     (Remotion Player)       │ Media           │
│ ▤  │ Assets          │                             │ Timing          │
│ ◫  │ Templates       │                             │ Transition      │
│ ◆  │ Brand           │  ▶ ⏮ ⏭  00:04.12 / 00:32  🔁 🔇 ⤢ │ Style           │
├────┴─────────────────┴─────────────────────────────┴─────────────────┤
│ Timeline: [Intro 3s]⇄[Hook 4s]⇄[Feature 5s]⇄[Product 6s]⇄[CTA 3s]    │
│           ─────────────────────────●──────────────────────────────    │
└──────────────────────────────────────────────────────────────────────┘
```

Rules:

- Panels are resizable (drag handles) and collapsible.
- Left rail switches the left panel: Scenes, Script, Assets, Templates, Brand.
- Selecting a scene in the timeline, the Scenes panel, the Script panel or the
  preview selects the same scene everywhere and seeks the player to it.
- Inspector always reflects the current selection (scene, transition, or
  project when nothing is selected).
- Minimum supported editor width: 1280px. Below that show a friendly
  "open on a larger screen" state. Dashboard/Projects/Templates pages are
  fully responsive.

## 15.3 Scene-first, script-driven editing

V1 editing is scene-based, not clip-based.

Timeline (bottom):

- Horizontal filmstrip of scene cards, width proportional to duration.
- Card shows: thumbnail (poster frame), scene type icon, title, duration.
- Drag card to reorder (dnd-kit). Drag right edge to change duration (snap to
  0.5s, show tooltip with new duration).
- Transition chip between cards; click to pick transition and duration.
- Playhead scrubs; click ruler to seek.
- Validation badges on cards (missing asset, too short, text overflow).
- "+" at the end and between cards to add a scene (opens scene type picker).

Script panel (left):

- One text block per scene. Editing text updates the scene; adding a block
  adds a scene; blocks can be split/merged/reordered.
- Paste a multi-paragraph script → one scene per paragraph (user picks type).
- Import JSON / CSV from this panel with inline validation errors.
- This is the same structure an AI generator will populate later.

## 15.4 Preview stage

- `@remotion/player` with custom controls: play/pause, step frame, seek,
  timecode (current / total), loop, mute, fit-to-window, zoom.
- Stage is letterboxed on a dark neutral background so colors read correctly.
- Format switcher updates the composition live (no re-render).
- Safe-zone overlay toggle: shows platform UI zones (Reels / Shorts / TikTok
  caption and button areas) so users keep text out of covered regions.
- Never block the UI on preview; use Player lazy loading and asset
  thumbnails/proxies for heavy media.

## 15.5 Inspector generated from scene schemas

Each scene type exports:

```ts
{
  type: "feature",
  propsSchema: z.object({...}),
  defaultProps: () => ({...}),
  inspector: InspectorField[]   // field kind + label + group + constraints
}
```

Field kinds: `text`, `textarea`, `number` (with slider/min/max/step), `color`,
`select`, `toggle`, `asset` (filtered by asset type), `font`, `alignment`.

The inspector renders itself from this metadata. Adding a new scene type must
NOT require writing inspector UI code.

Groups: `Content`, `Media`, `Timing`, `Transition`, `Style`.

## 15.6 Asset library

- Grid with thumbnails (video poster, audio waveform/duration, image).
- Drag-and-drop upload zone + file picker; multi-file; progress per file.
- Filter by type, search by name, sort by recent.
- Show duration, dimensions, size; show "used in N scenes".
- Drag an asset onto a scene card or onto the preview to assign it.
- Missing / failed assets are clearly marked and listed in Problems.
- Validate type and size client-side before upload; show clear errors.

## 15.7 Export / render UX

- "Export" button in toolbar opens a dialog: format summary, quality preset
  (Draft / Standard / High), estimated duration and file size, output name.
- Progress panel with stages (Queued → Preparing → Rendering n/N frames →
  Encoding → Uploading → Done) and a Cancel button.
- On completion: Web → Download; Desktop → "Open" and "Reveal in Finder /
  Explorer".
- Render Queue page lists jobs with status, time, and output.

## 15.8 Editor fundamentals (required in V1)

- Undo / redo (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z) covering all project edits.
- Autosave with visible status: `Saved` / `Saving…` / `Unsaved changes`.
  Prompt before closing with unsaved changes.
- Keyboard shortcuts: Space play/pause, ←/→ frame step, Shift+←/→ 1s,
  Delete remove scene, Cmd/Ctrl+D duplicate, Cmd/Ctrl+S save, `?` shortcut
  cheat sheet. Use Cmd on macOS, Ctrl elsewhere.
- Empty states for every list (projects, assets, scenes) with a primary action.
- Skeleton loaders for async content; never a blank screen.
- Toasts for success/errors; error toasts include an action (Retry, Open).
- Inline validation and a "Problems" list (missing assets, invalid duration,
  missing font) that links to the offending scene.
- Confirm destructive actions (delete project/scene/asset). Support "Undo"
  in the toast where practical.

## 15.9 Visual design

- Dark theme by default (editor); light theme supported via CSS variables.
  Theme follows system by default; user can override.
- Design tokens in CSS variables (colors, spacing, radius, typography) shared
  by web and desktop. Brand kit colors apply to the VIDEO, never to the app UI.
- Dense, professional density in the editor (13–14px base); regular density
  on dashboard pages.
- Accessible: visible focus rings, keyboard navigation for all panels and the
  timeline, ARIA roles on the timeline and player controls, WCAG AA contrast,
  respect `prefers-reduced-motion` for UI animations (not for video content).

## 15.10 Fonts and language

- Script text, scene text and the editor must handle non-Latin scripts
  (e.g., Devanagari/Nepali, CJK) correctly. Default fonts must have wide
  Unicode coverage with sensible fallbacks.
- Users can upload custom fonts (brand kit); fonts load before preview/render.
- Design the UI string layer so it can be localized later (no hardcoded
  concatenated sentences), but do not implement i18n in V1.

## 15.11 Platform adapter for the shared UI

The shared UI never calls browser upload APIs or Electron IPC directly.
Inject one adapter from the host app:

```ts
interface PlatformAdapter {
  pickFiles(options): Promise<PickedFile[]>;
  saveFile(options): Promise<string | null>; // desktop: dialog; web: download
  revealInFolder?(path: string): Promise<void>; // desktop only
  openExternal(url: string): Promise<void>;
  capabilities: { localRender: boolean; revealInFolder: boolean };
}
```

Web implements it with `<input type="file">` and downloads; desktop with
preload/IPC and native dialogs.

---

# 16. Desktop Application

Create an Electron desktop application using the same:

- React components
- TypeScript types
- video engine
- scene components
- templates
- validation
- project schema
- timeline logic

Desktop-specific functionality should be isolated behind interfaces.

Examples:

```ts
FileSystemProvider;
DesktopStorageProvider;
LocalRenderer;
WindowManager;
NativeDialogProvider;
```

Use Electron IPC securely.

Desktop UX requirements:

- Native application menu: File (New, Open, Open Recent, Save, Save As,
  Import Project, Export Project, Export Video), Edit (Undo, Redo, Cut, Copy,
  Paste, Delete), View (panels, zoom), Help.
- Platform-correct title bar (macOS `hiddenInset`), window state persisted.
- Drag files from Finder/Explorer onto the editor to import assets.
- Recent projects on the dashboard; "Reveal in Finder/Explorer" after export.
- Keyboard shortcuts use Cmd on macOS and Ctrl on Windows/Linux.
- Local assets are served to the renderer via a custom `app://` protocol.
  Do NOT disable `webSecurity` or load `file://` URLs.
- Long renders run in a `utilityProcess`/child process so the UI stays
  responsive; progress is streamed to the renderer via IPC.

---

# 17. Local Rendering

The desktop application should support local rendering.

Conceptually:

```text
Electron
   ↓
Renderer Service
   ↓
Remotion
   ↓
FFmpeg / Chromium
   ↓
MP4
```

Allow the user to choose:

```text
Export Video
```

and save the resulting file to a local directory.

Do not upload local assets to a server unless the user explicitly chooses cloud rendering.

---

# 18. Web Rendering

For the web application, design an asynchronous render-job architecture.

Example:

```text
POST /api/render
        ↓
Create RenderJob
        ↓
Queue
        ↓
Worker
        ↓
Remotion Renderer
        ↓
Upload result
        ↓
Update job status
```

Statuses:

```text
queued
preparing
rendering
encoding
uploading
completed
failed
cancelled
```

The UI should show rendering progress.

---

# 19. Renderer Abstraction

Create:

```ts
interface VideoRenderer {
  render(project: VideoProject, options: RenderOptions): Promise<RenderResult>;
}
```

Possible implementations:

```text
LocalRemotionRenderer
CloudRemotionRenderer
FutureRenderer
```

The application should never directly depend on a specific renderer.

---

# 20. Template System

Create a reusable template registry.

Example:

```ts
registerTemplate({
  id: "modern-promo",
  name: "Modern Promotional",
  supportedFormats: ["9:16", "16:9", "1:1"],
  scenes: [...]
});
```

Initial templates:

1. Modern Promotional
2. Product Advertisement
3. Social Reel
4. YouTube Short
5. Instagram Story

Do not duplicate templates merely because the target platform differs.

A template should support multiple aspect ratios when possible.

---

# 21. Brand Kit

Create a reusable brand system.

Support:

- logo
- colors
- typography
- font
- watermark
- intro
- outro
- CTA style

Example:

```ts
type BrandConfig = {
  name: string;
  logo?: Asset;
  colors: {
    primary: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  fonts?: FontConfig[];
};
```

---

# 22. Project Persistence

Projects should be serializable.

A project should be exportable as:

```text
project.json
```

A desktop user should be able to:

```text
File → Export Project
```

and receive a portable project.

Future goal:

```text
Project Package
├── project.json
├── assets/
├── fonts/
└── previews/
```

Design for this from the beginning.

---

# 23. Database

For the web application, use PostgreSQL/Supabase.

Suggested entities:

```text
users
projects
project_versions
templates
assets
brands
render_jobs
render_outputs
```

Keep the database layer isolated from the video engine.

Do not put database queries inside Remotion components.

---

# 24. Versioning

Project files MUST be versioned.

Example:

```ts
schemaVersion: '1.0';
```

When the project schema changes, implement migration functions.

Example:

```ts
migrateProject(project);
```

This is important because users may have projects created by older application versions.

---

# 25. Validation

Use Zod for runtime validation.

Create schemas for:

```text
VideoProject
VideoScene
Asset
Template
BrandConfig
RenderOptions
```

Validate imported JSON/CSV before creating a project.

Display useful validation errors to users.

---

# 26. Error Handling

Do not silently fail.

Handle:

- missing assets
- unsupported media
- invalid duration
- invalid video format
- missing fonts
- corrupt files
- rendering failure
- insufficient disk space
- cancelled render
- unsupported codec

Use structured errors.

---

# 27. Testing

Implement:

### Unit tests

For:

- project validation
- timeline calculations
- duration calculations
- scene configuration
- template validation
- migrations

### Component tests

For:

- scenes (use Remotion `renderStill` snapshot tests for key frames)
- UI components (React Testing Library)
- schema-driven inspector (every scene type renders a valid inspector)

### Integration tests

For:

```text
Project → Composition → Render
```

### E2E

Use Playwright for web.

For desktop, add appropriate Electron testing later.

---

# 28. Security

Web:

- authentication
- authorization
- project ownership
- secure file uploads
- file type validation
- file size limits
- signed asset URLs
- rate limiting
- server-side validation

Electron:

- contextIsolation enabled
- nodeIntegration disabled
- sandbox where practical
- secure preload
- explicit IPC channels
- validate all IPC input
- do not expose arbitrary filesystem APIs

Never allow arbitrary renderer code to execute with Node privileges.

---

# 29. Performance

The application must be designed for large video files.

Avoid loading entire videos into memory.

Use:

- streaming
- filesystem paths
- URLs
- lazy loading
- thumbnails
- proxies/previews where appropriate

Timeline preview should remain responsive.

Do not render a complete MP4 every time the user changes a scene.

Use Remotion preview/player mechanisms for interactive editing.

---

# 30. Desktop Packaging

Use electron-builder initially.

Build:

### macOS

```text
.dmg
```

### Windows

```text
.exe
```

### Linux

```text
.AppImage
.deb
```

Configure build scripts for all platforms.

Prepare the architecture for:

- macOS code signing
- Apple notarization
- Windows code signing
- auto updates

Do not require signing during local development.

---

# 31. CI/CD

Use GitHub Actions.

Create workflows for:

```text
CI
├── install
├── lint
├── typecheck
├── unit tests
├── build web
└── build desktop

Release
├── macOS build
├── Windows build
├── Linux build
└── publish artifacts
```

Use platform-specific GitHub runners where necessary.

---

# 32. Configuration

Use environment-specific configuration.

Never hardcode:

- API keys
- Supabase credentials
- secrets
- storage credentials
- signing credentials

Create:

```text
.env.example
```

Document all environment variables.

---

# 33. Logging

Create a shared logging abstraction.

Desktop logs should be available locally.

Web logs should be structured.

Do not use random console.log throughout the application.

Use a logger abstraction.

---

# 34. Documentation

Create:

```text
README.md

docs/
├── architecture.md
├── development.md
├── video-engine.md
├── scene-system.md
├── template-system.md
├── project-schema.md
├── rendering.md
├── desktop.md
├── web.md
├── ui-ux.md
├── deployment.md
└── contributing.md
```

Document architectural decisions.

---

# 35. Coding Standards

Use:

- strict TypeScript
- ESLint
- Prettier
- clear naming
- small reusable functions
- dependency inversion where useful
- interfaces for infrastructure
- no unnecessary abstraction
- no duplicated business logic

Avoid premature overengineering.

Do not create abstractions merely for the sake of abstraction.

---

# 36. Important Separation of Concerns

Maintain this dependency direction:

```text
UI
 ↓
Application Services
 ↓
Domain / Video Core
 ↓
Infrastructure
```

The core video engine must NOT depend on:

- Next.js
- Electron
- Supabase
- browser-specific APIs
- Electron APIs

Instead:

```text
Core
 ↑
Adapters
 ↑
Web / Desktop
```

---

# 37. Future AI Architecture

Do NOT implement AI now.

However, create an extension point:

```ts
interface VideoContentGenerator {
  generate(input: ContentGenerationInput): Promise<VideoProjectDraft>;
}
```

Future implementations could be:

```text
GeminiContentGenerator
OpenAIContentGenerator
ClaudeContentGenerator
```

They should generate:

```text
VideoProjectDraft
```

The same manual editor and Remotion renderer should then be able to process the generated project.

This is a critical future-proofing requirement.

---

# 38. Future Asset Providers

Create extension points for:

```text
ImageProvider
VideoProvider
AudioProvider
TTSProvider
StockMediaProvider
```

Do not implement them now.

The first version should rely on user-uploaded assets.

---

# 39. First Version Scope

Do NOT attempt to build the complete product immediately.

Build a working vertical slice first:

```text
Create Project
      ↓
Choose 9:16
      ↓
Choose Modern Promotional Template
      ↓
Add 3–5 scenes
      ↓
Upload images/videos/audio
      ↓
Enter script
      ↓
Preview
      ↓
Render
      ↓
Export MP4
```

This must work in:

1. Web
2. Desktop

before expanding the feature set.

---

# 40. Suggested Implementation Phases

## Phase 1 — Foundation

- Monorepo
- pnpm
- Turborepo
- TypeScript
- shared packages
- linting
- formatting
- testing
- CI

## Phase 2 — Core Video Engine

- project schema
- scene schema
- timeline
- assets
- transitions
- animations
- Remotion integration

## Phase 3 — First Templates

Build:

- Modern Promotional
- Social Reel
- Product Advertisement

## Phase 4 — Web Editor

- design tokens, theme, shared layout shell (`packages/ui`)
- dashboard
- project creation wizard (name → format → template)
- asset upload and library
- script panel
- schema-driven inspector
- preview stage with controls and safe-zone overlay
- scene timeline (reorder, duration, transitions)
- undo/redo, autosave, shortcuts
- export dialog and progress

## Phase 5 — Desktop

- Electron
- local filesystem
- local assets
- local rendering
- project import/export

## Phase 6 — Cloud Rendering

- render jobs
- workers
- storage
- progress
- output management

## Phase 7 — More Templates

Add additional templates and scenes.

## Phase 8 — AI Extension

Only after the manual system is stable.

---

# 41. Development Rules

Before writing substantial code:

1. Inspect the repository.
2. Create an architecture document.
3. Define package boundaries.
4. Define the core TypeScript schemas.
5. Define the dependency graph.
6. Define the initial vertical slice.
7. Then implement.

Do not generate thousands of lines of code immediately.

Build incrementally.

After each major phase:

- run tests
- run typecheck
- run lint
- build the affected applications
- fix errors
- document the result

---

# 42. Definition of Done for V1

V1 is complete when a user can:

### Web

1. Open the application.
2. Create a project.
3. Choose a video format.
4. Choose a template.
5. Add scenes.
6. Enter scripts.
7. Upload assets.
8. Reorder scenes.
9. Change scene duration.
10. Configure transitions.
11. Preview the video.
12. Undo/redo edits and see autosave status.
13. Render the video with visible progress.
14. Download the MP4.

### Desktop

The same workflow should work locally, with:

1. Local project storage.
2. Local asset storage.
3. Local video rendering.
4. MP4 export.
5. Project import/export.

---

# 43. Do Not Do These Things

Do NOT:

- build separate video engines for web and desktop
- duplicate React components unnecessarily
- couple Remotion directly to Supabase
- couple Remotion directly to Electron
- put database queries inside video scenes
- put business logic inside UI components
- hardcode templates into the renderer
- hardcode platform-specific video dimensions throughout the code
- implement AI in V1
- implement every possible feature before the first working build
- create unnecessary microservices
- over-engineer the timeline in V1
- expose Node.js directly to Electron renderer
- store secrets in source code
- import `next/*` or `electron` inside `packages/ui` or any shared package
- hand-write inspector forms per scene (they are generated from scene schemas)
- apply brand kit colors to the application UI
- block the editor UI on rendering or heavy media loading

---

# 44. Final Deliverable

At the end of the implementation, provide:

1. Working monorepo
2. Working web application
3. Working Electron desktop application
4. Shared video engine
5. Shared React components
6. Shared TypeScript schemas
7. Remotion templates
8. Local rendering
9. Web rendering architecture
10. Project import/export
11. Tests
12. CI/CD
13. Documentation
14. `.env.example`
15. Development instructions
16. Production build instructions
17. Desktop installer build instructions

Most importantly:

**The architecture must make it easy to add AI later without rewriting the video engine, editor, templates, or renderer.**

Start by inspecting the existing repository and determining whether this is a new project or an existing codebase that should be preserved. Do not destroy or rewrite existing functionality without first understanding it.

Before implementing Phase 1, produce a concise architecture proposal and identify any important technical risks or decisions that need to be made. Then proceed with implementation using sensible defaults rather than repeatedly asking for confirmation.
