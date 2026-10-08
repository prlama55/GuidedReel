---
name: create-guidedreel
description: Use when changing or debugging the `create-guidedreel` npm scaffolder (packages/create-guidedreel) — app mode vs --fork, the embedded template snapshot and `_dotfile` encoding, identity renames (scope/product/slug/author), generated packages/extensions, --core-tarballs testing before npm publish, or a generated project that fails to install/typecheck/build. Triggers — "pnpm create guidedreel", "npx create-guidedreel", "template snapshot", "_gitignore", "scaffold", "thin mode", "fork mode", "core-tarballs", "pnpm dlx cache", "generated project fails".
---

# create-guidedreel

`packages/create-guidedreel`: esbuild-bundled CLI (`dist/cli.js`, ESM + `createRequire` banner, `@clack/prompts`) plus an embedded `template/` snapshot. `pnpm create guidedreel my-app` / `npx create-guidedreel`.

## Two modes (`src/options.ts` → `ScaffoldMode`)

- **thin (default)**: an app on `@guidedreel/core`. Copies `apps/web` and/or `apps/desktop` plus `THIN_ROOT_FILES` (`.gitignore`, `.npmrc`, `.prettierrc`, `.prettierignore`, `.env.example`, `tsconfig.base.json`, `turbo.json`, `eslint.config.js`, `pnpm-workspace.yaml`). Generates (`src/thin.ts`): root `package.json`, `packages/extensions` (`@scope/extensions` with `launch-promo` example template + test), `vitest.workspace.ts`, `.github/workflows/ci.yml`, `THIRD_PARTY_NOTICES.md` (upstream LICENSE), README (`renderThinReadme`), plus `CLAUDE.md` and `.claude/skills/{extend-templates,app-shell}/SKILL.md` (`thinClaudeFiles`) so Claude Code knows the generated app's rules and the built-in scene props. Edits: app manifests get `@guidedreel/core`/`@guidedreel/config` `^<cli version>` and `@scope/extensions: workspace:*` (web: dependencies, desktop: devDependencies), `next.config.ts` gets `transpilePackages: ['@scope/extensions']`, `providers.tsx` and `App.tsx` get `templateRegistry.registerAll(templates)`.
- **fork (`--fork`)**: renamed copy of the whole monorepo minus `EXCLUDED_PATHS` (`README.md`, `CLAUDE.md`, `docs/examples/`, `docs/branding/`, `tooling/`, `packages/create-guidedreel/`). Deselected app → its dir, CI job, root scripts, `release.yml` (desktop) and lockfile importer are removed; `pnpm install --frozen-lockfile` still passes.

## Snapshot (`src/snapshot.ts`, `scripts/snapshot-template.ts`)

`git ls-files --cached --others --exclude-standard` of the working tree → `template/`. Dot segments become `_` (`.github` → `_github`, `.gitignore` → `_gitignore`) and `pnpm-lock.yaml` → `_pnpm-lock.yaml` because npm strips those names; `decodeTemplatePath` restores them. The snapshot throws if any tracked segment starts with `_`. The lockfile copy drops the `packages/create-guidedreel` importer. `--ref <branch|tag>` downloads the GitHub codeload tarball instead (system `tar`), `--template-dir` uses a local dir.

## Renames (`createTransformer` in `src/scaffold.ts`)

Order matters: upstream URLs → tokens; fork: `@guidedreel/` → `@scope/`; thin: `@guidedreel/web|desktop` → `@scope/...` and `@guidedreel/` → `SCOPE_TOKEN` (kept, npm packages); `com.guidedreel.app` → `com.<slug>.app`; `GuidedReel` → display name; `guidedreel` → slug; `Padma Raj Lama` → author; tokens restored. `LICENSE` is verbatim. Structural edits (package.json metadata, electron-builder `publish`/owner, `website:` line, `layout.tsx` author URL, ci.yml jobs, lockfile importers) run before the text pass; thin tarball `overrides` are appended after it (paths contain the upstream slug).

## Testing

- `pnpm --filter create-guidedreel test` (26 tests): snapshots the repo into a temp dir and scaffolds fork both/web/desktop and thin both/web variants.
- Real check of app mode before npm publish: `pnpm build:packages && pnpm -r --filter './packages/*' --filter '!create-guidedreel' pack --pack-destination /tmp/guidedreel-tgz`, then `node packages/create-guidedreel/dist/cli.js my-app --core-tarballs /tmp/guidedreel-tgz -y`. The generated `pnpm-workspace.yaml` gets `overrides` mapping every `@guidedreel/*` to `file:<tgz>` (remove once on npm). Verified 2026-10-08: install, typecheck, test, lint, `next build`, electron build all pass.
- `--core-dir` with `link:` was tried and dropped: Turbopack cannot resolve symlinks outside the app root.
- **`pnpm dlx <tarball>` caches by spec**: a repacked `create-guidedreel-0.1.0.tgz` is not picked up. Use `node dist/cli.js` or `npx <tarball>`.
- Thin apps cannot add scene _types_ (components must be in the render bundle); templates/presets only. Custom scene plugins would be separate packages bundled by core's renderer (future).
