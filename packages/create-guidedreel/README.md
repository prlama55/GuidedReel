# create-guidedreel

Create a video creator app on top of [`@guidedreel/core`](https://www.npmjs.com/package/@guidedreel/core) in one command. You get a Next.js web app, an Electron desktop app, or both, plus a `packages/extensions` workspace where you register your own templates. The app never touches Remotion directly; the engine arrives as npm dependencies and updates with `pnpm up "@guidedreel/*"`.

```bash
pnpm create guidedreel my-studio
# or
npx create-guidedreel@latest my-studio
```

The prompts ask what to create (an app on core, or a fork of the whole GuidedReel monorepo), the product name, package scope, which apps to include, the author and an optional repository URL. Then the CLI copies the files, runs `pnpm install` and makes a first git commit.

Non-interactive:

```bash
npx create-guidedreel my-studio --name "My Studio" --scope mystudio --apps web,desktop \
  --author "Jane Doe" --repo https://github.com/jane/my-studio -y
```

## What you get (default: app on `@guidedreel/core`)

```text
my-studio/
├── apps/web/                 Next.js shell
├── apps/desktop/             Electron shell
├── packages/extensions/      @mystudio/extensions: your templates (an example is included)
├── package.json              pnpm + Turborepo scripts
├── pnpm-workspace.yaml       versions pinned to the ones core was built with
├── .github/workflows/ci.yml
├── CLAUDE.md                 project rules for Claude Code
└── .claude/skills/           extend-templates, app-shell
```

Both shells call `templateRegistry.registerAll(templates)` with the array exported from `packages/extensions`, so adding a template is: copy the example, change its id, add it to the array. `pnpm test` instantiates every template in every format it supports and validates the result.

`--fork` copies the whole GuidedReel monorepo instead (engine packages included, renamed to your scope) for people who want to change the engine itself.

## Options

| Flag                    | Meaning                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `--fork`                | Copy the whole engine monorepo instead of creating an app on `@guidedreel/core`                |
| `--name <text>`         | Product name shown in the app, window titles and metadata (default: from the directory name)   |
| `--scope <name>`        | Package scope for your workspaces: `@scope/web`, `@scope/extensions` (default: directory slug) |
| `--apps <list>`         | `web`, `desktop` or `web,desktop` (default: both)                                              |
| `--author <text>`       | Author for credits, copyright and `package.json` (default: `git config user.name`)             |
| `--repo <url>`          | Repository URL for `package.json`; GitHub URLs also fill electron-builder's publish config     |
| `--core-dir <path>`     | App mode: `link:` `@guidedreel/core` and `@guidedreel/config` from a local checkout (testing)  |
| `--ref <git-ref>`       | Download the template from GitHub at a branch or tag instead of the embedded copy              |
| `--template-dir <path>` | Use a local template directory (development)                                                   |
| `--no-install`          | Skip `pnpm install`                                                                            |
| `--no-git`              | Skip `git init` and the first commit                                                           |
| `-y, --yes`             | Accept defaults, never prompt                                                                  |

## What it does

- **App mode** copies only `apps/web` and/or `apps/desktop` plus the root tooling files from the GuidedReel snapshot, points them at `@guidedreel/core` and `@guidedreel/config` on npm (same version as this CLI), generates `packages/extensions` with an example template and its test, wires template registration into both shells, and writes a README, CI workflow and `THIRD_PARTY_NOTICES.md` (the shells are MIT code from GuidedReel).
- **Fork mode** copies the monorepo minus its README, example media, branding sources and this CLI, renames `@guidedreel/*` to `@scope/*`, `GuidedReel` to your product name, the `guidedreel` slug and the author, and drops the app you did not pick together with its CI job, root scripts, release workflow and lockfile importer. `LICENSE` is kept verbatim.
- Both modes run `pnpm install` and `git init` unless disabled.

Requirements: Node 22+, pnpm 10 (`corepack enable`). The first video render downloads Remotion's headless browser once. App mode needs the `@guidedreel/*` packages on npm. Before a release, test with `pnpm -r --filter './packages/*' pack --pack-destination /tmp/tgz` in the GuidedReel checkout and `--core-tarballs /tmp/tgz`.

## Development

Inside the GuidedReel monorepo:

```bash
pnpm --filter create-guidedreel build      # bundles the CLI and snapshots the repo into template/
pnpm --filter create-guidedreel test       # unit tests + scaffold tests against a fresh snapshot
node packages/create-guidedreel/dist/cli.js ../my-studio --no-install -y
```

`pnpm dlx <tarball>` caches the install by package spec, so repacking the same version and running `pnpm dlx` again reuses the stale copy. For local checks run `node dist/cli.js` directly, use `npx <tarball>`, or bump the version.

`template/` is generated from the git working tree (tracked and untracked, ignored files excluded) by `scripts/snapshot-template.ts`. Dot-files are stored as `_gitignore`, `_npmrc`, `_pnpm-lock.yaml` and so on because npm would strip them from the package; the CLI restores the names. `pnpm publish` runs `prepack`, which rebuilds both.

## License

MIT. Projects created with this tool contain GuidedReel code under the MIT License; keep the `LICENSE` notice.
