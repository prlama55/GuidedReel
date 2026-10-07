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
- **Packages are built to `dist/`** with [tsup](https://tsup.egoist.dev) (ESM, bundled per entry, declaration files, source maps; preset in `@guidedreel/config/tsup`). `exports` point at `dist/`, so the apps, tests and Remotion's webpack all consume the same compiled output that npm users get. Turborepo runs `^build` before `dev`, `typecheck`, `test` and the app builds, so a fresh clone needs no manual step; `pnpm dev:web` / `pnpm dev:desktop` start `tsup --watch` for every package alongside the app dev server. Relative imports inside packages stay extensionless (tsup resolves them).
- **`@guidedreel/core` is the only package the apps depend on.** It re-exports `schema` + `engine` + `templates` at the root and `ui`, `render`, `storage`, `providers` and `styles.css` as subpaths. Remotion is a dependency of `compositions`, `ui` and `renderer`, never of an app; the app lint preset (`createConfig({ app: true })`) rejects direct `remotion`, `@remotion/*` and non-core `@guidedreel/*` imports.
- **Server bundlers externalize the renderer.** Next.js lists `@guidedreel/renderer`, `@guidedreel/compositions` and `@remotion/*` in `serverExternalPackages`; electron-vite externalizes every dependency of the desktop app. Both load the compiled packages from `node_modules` at runtime (Electron's Node supports `require()` of ESM), which keeps Remotion's native binaries and the on-disk bundle entry resolution working.
- **Styling.** `@guidedreel/ui/dist/styles.css` starts with `@source "./"`, so the consuming app's Tailwind v4 build scans the compiled components. Apps only `@import "@guidedreel/core/styles.css"` after `tailwindcss`.
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
- **Integration**: `pnpm test:integration` runs Project → bundle → composition → MP4 (about 20 s after the first browser download).
- **E2E web**: `pnpm test:e2e` (requires `pnpm --filter @guidedreel/web exec playwright install chromium` once).
- **E2E desktop**: `pnpm build:desktop && pnpm turbo run test:e2e --filter=@guidedreel/desktop` drives the built Electron app through create → export → MP4.
- **Scenes**: open Remotion Studio (`pnpm --filter @guidedreel/compositions studio`) to iterate on scene components with the sample project.
- **Example videos**: `pnpm --filter @guidedreel/renderer examples` re-renders the README examples into `docs/examples` (MP4, GIF and poster per template). See [docs/examples/README.md](examples/README.md).

## Scaffolding a new project (`create-guidedreel`)

`packages/create-guidedreel` lets anyone start a new product with `pnpm create guidedreel my-studio`. By default it creates an **app on `@guidedreel/core`**: the web and/or desktop shell copied from `apps/`, a `packages/extensions` workspace with an example template that both shells register via `templateRegistry.registerAll`, and `@guidedreel/core` + `@guidedreel/config` as npm dependencies pinned to the CLI's version. `--fork` produces the older full copy of the monorepo for engine work. Before a release, test app mode against local tarballs: `pnpm build:packages && pnpm -r --filter './packages/*' pack --pack-destination /tmp/tgz`, then `--core-tarballs /tmp/tgz` (pnpm `overrides` point every `@guidedreel/*` at a tarball, so the install matches npm).

- `pnpm --filter create-guidedreel build` bundles `src/cli.ts` with esbuild into `dist/cli.js` and runs `scripts/snapshot-template.ts`, which copies the git working tree (tracked and untracked, ignored files excluded) into `template/`, minus `README.md`, `CLAUDE.md`, `docs/examples`, `docs/branding`, `tooling` and the CLI itself. Dot-files are stored as `_gitignore`, `_npmrc`, `_pnpm-lock.yaml`, … because npm strips them from packages; the CLI restores the names.
- The CLI rewrites `@guidedreel/*` to the chosen scope, `GuidedReel` to the product name, `guidedreel` (root package, IndexedDB name, temp folders, `com.guidedreel.app`) to the slug and the author in credits; `LICENSE` stays verbatim. Deselecting an app removes its directory, CI job, root scripts, the release workflow and its lockfile importer, so `pnpm install --frozen-lockfile` still passes.
- `--ref <branch|tag>` downloads the template from GitHub instead of the embedded copy (needs network and a system `tar`).
- To try the CLI locally run `node packages/create-guidedreel/dist/cli.js <dir>` after a build. `pnpm dlx <tarball>` caches by package spec, so a repacked tarball with the same version is not picked up.
- Tests (`pnpm --filter create-guidedreel test`) snapshot the current repo into a temp dir and scaffold three variants, so new tracked files are covered automatically. Add a path to `EXCLUDED_PATHS` in `src/constants.ts` if it should not ship in generated projects.
- Publish with `pnpm --filter create-guidedreel publish` (runs `prepack` → `build`). Bump the package version together with the repo and commit first so the template matches a known state.

## Publishing to npm

All `@guidedreel/*` packages (except the private `config`) and `create-guidedreel` are published with one shared version, managed by [Changesets](https://github.com/changesets/changesets) (`.changeset/config.json`, fixed group).

1. `pnpm changeset` in your branch: pick the packages, the bump type and write the summary.
2. Merge to `main`. The `Publish packages` workflow (`.github/workflows/release-npm.yml`) opens a "Version Packages" pull request that bumps versions, updates CHANGELOGs and the lockfile.
3. Merge that PR. The workflow runs `pnpm release` (`build:packages` then `changeset publish`) with the `NPM_TOKEN` secret and npm provenance.

Manually: `pnpm version-packages && pnpm release` after `npm login`. The npm organisation `guidedreel` must exist and the token must be allowed to publish to it. `pnpm --filter <pkg> pack` shows exactly what a tarball contains (`dist/` only).

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
