# Development

## Prerequisites

- Node 22 or newer
- pnpm 10 (`corepack enable` picks the version from `package.json`)
- macOS, Windows or Linux. No system FFmpeg or Chrome is needed; Remotion downloads its own headless browser on first render.

## Install and run

```bash
pnpm install
pnpm dev:web        # Next.js at http://localhost:3000
pnpm dev:desktop    # Electron (electron-vite dev server with HMR)
```

Copy `.env.example` to `apps/web/.env.local` if you need to change render directories or limits. Nothing is required for local development.

## Workspace layout and tooling

- **pnpm workspaces + catalog**: every third-party version is pinned once in `pnpm-workspace.yaml` (`catalog:`). All `@remotion/*` packages must share one version.
- **Hoisted node_modules** (`.npmrc`): required for reliable Electron packaging in a monorepo.
- **Turborepo**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` run the per-package scripts with caching.
- **Packages are consumed from TypeScript source** (`exports` point at `src/index.ts`). Next.js uses `transpilePackages`; Vite and Vitest handle TS natively; Remotion's webpack bundles TS. Relative imports are extensionless.
- **Lifecycle scripts**: pnpm 10 blocks postinstall scripts; the allowlist lives under `onlyBuiltDependencies` in `pnpm-workspace.yaml` (Electron, esbuild, Remotion compositors).

## Scripts per package

| Package                    | Scripts                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| all packages               | `typecheck`, `lint`, `test`, `clean`                                                     |
| `@guidedreel/compositions` | `studio` — Remotion Studio for scenes                                                    |
| `@guidedreel/renderer`     | `test:integration` — renders a real MP4; `build:bundle <dir>` — prebuilt Remotion bundle |
| `@guidedreel/web`          | `dev`, `build`, `start`, `test:e2e` (Playwright)                                         |
| `@guidedreel/desktop`      | `dev`, `build`, `dist`, `dist:dir`, `dist:mac`, `dist:win`, `dist:linux`                 |

## Testing

- **Unit** (Vitest): schema validation and migrations, timeline and duration math, scene operations, script importers, templates, storage, editor store.
- **Integration**: `pnpm --filter @guidedreel/renderer test:integration` runs Project → bundle → composition → MP4 (about 20 s after the first browser download).
- **E2E web**: `pnpm test:e2e` (requires `pnpm --filter @guidedreel/web exec playwright install chromium` once).
- **E2E desktop**: `pnpm --filter @guidedreel/desktop build && pnpm --filter @guidedreel/desktop test:e2e` drives the built Electron app through create → export → MP4.
- **Scenes**: open Remotion Studio (`pnpm --filter @guidedreel/compositions studio`) to iterate on scene components with the sample project.
- **Example videos**: `pnpm --filter @guidedreel/renderer examples` re-renders the README examples into `docs/examples` (MP4, GIF and poster per template). See [docs/examples/README.md](examples/README.md).

## Conventions

- Strict TypeScript, ESLint (flat config from `@guidedreel/config/eslint`), Prettier.
- `packages/ui` must not import from `next/*` or `electron` (lint-enforced).
- `schema` and `engine` contain no React, Node or browser-specific APIs.
- Business rules live in `engine` (pure functions); the editor store only composes them.
- Use the `Logger` from `@guidedreel/engine`; no stray `console.log`.
- Errors are `VideoCreatorError` with a `code`; UIs switch on codes, not messages.

## Adding a scene type

1. Add a definition in `packages/schema/src/scenes/<type>.ts` (props schema, defaults, inspector fields, asset keys, script key) and register it in `scenes/index.ts` and `SCENE_TYPES`.
2. Add the React component in `packages/compositions/src/scenes/<Type>Scene.tsx` and register it in `scenes/registry.ts`.
3. Add an icon mapping in `packages/ui/src/primitives/icons.tsx` and a colour class in `packages/ui/src/styles.css`.

The inspector, templates, importers and validation pick it up automatically. The schema test enforces that every prop has an inspector field.

## Adding a template

Create `packages/templates/src/templates/<id>.ts` exporting a `TemplateDefinition` (meta, Zod input schema, `sampleInput`, `create`) and register it in `src/index.ts`. The template test instantiates every template in every supported format and validates the result.
