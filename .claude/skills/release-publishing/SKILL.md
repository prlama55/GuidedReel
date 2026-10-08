---
name: release-publishing
description: Use when versioning or publishing GuidedReel — npm packages (@guidedreel/*, create-guidedreel) via Changesets, the release-npm GitHub workflow, NPM_TOKEN/provenance, desktop installer releases (release.yml, GitHub Releases drafts, artifactName), and the end-user install scripts (scripts/install.sh, install.ps1). Triggers — "publish to npm", "changeset", "version packages", "npm org guidedreel", "NPM_TOKEN", "release tag", "draft release", "install.sh", "irm | iex", "latest release 404".
---

# Releases: npm packages, desktop installers, install scripts

## npm packages (Changesets, fixed version group)

- Published: `@guidedreel/{schema,engine,templates,compositions,renderer,providers,storage,ui,core,config}` and `create-guidedreel`. Private: `@guidedreel/web`, `@guidedreel/desktop`.
- `.changeset/config.json`: `fixed: [["@guidedreel/*", "create-guidedreel"]]` (one shared version), `privatePackages: { version: false, tag: false }`, `access: public`. A pending changeset (`.changeset/core-package.md`, minor) exists for the dist/core release.
- Scripts (root `package.json`): `pnpm changeset` · `pnpm version-packages` (= `changeset version && pnpm install --lockfile-only`) · `pnpm release` (= `pnpm build:packages && changeset publish`). `create-guidedreel` has `prepack` → rebuilds CLI + template snapshot.
- Workflow `.github/workflows/release-npm.yml` (push to `main`): `changesets/action` opens/updates a "Version Packages" PR; once merged (no pending changesets) it runs `pnpm release` with `NPM_TOKEN` and `NPM_CONFIG_PROVENANCE=true` (`id-token: write`).
- First publish checklist: create the free npm org `guidedreel` (scoped names need it; `create-guidedreel`, `guidedreel`, `@guidedreel/core` were free on 2026-10-08), `npm login`, commit, `pnpm version-packages`, commit, `pnpm release` (`--otp` if 2FA), push tags. Dry run: `pnpm -r --filter './packages/*' publish --dry-run --access public --no-git-checks`.
- Before publishing, app mode of the scaffolder can only be tested with tarballs ([[create-guidedreel]]).

## Desktop installers

- `.github/workflows/release.yml`: on tag `v*` builds mac/win/linux with `pnpm build:desktop` + `electron-builder --publish never`, uploads artifacts, creates a **draft** GitHub release. Publish the draft manually; `/releases/latest` ignores drafts, so the install scripts see nothing until then. The tag must include every CI fix: v0.2.0 was first tagged at `100db42`, one commit before `9ee166e` (the packaging fix), so its run failed and the hand-published v0.2.0 release has no assets. Re-point the tag (`git tag -f`, `git push --force origin refs/tags/vX`) or cut a new version; auto mode treats both the tag force-push and app `package.json` bumps as destructive, so the user runs them.
- `apps/desktop/electron-builder.yml` sets `artifactName: ${productName}-${version}-${os}-${arch}.${ext}` → `GuidedReel-0.1.0-mac-arm64.dmg`, `GuidedReel-0.1.0-win-x64.exe`, `GuidedReel-0.1.0-linux-x86_64.AppImage`, `guidedreel-0.1.0-linux-amd64.deb` (electron-builder maps Linux arch names). Signing/notarization only via CI secrets (`CSC_LINK`, `APPLE_ID`, …); builds are unsigned otherwise.
- Packaging correctness is covered by `apps/desktop/e2e/packaged.spec.ts` ([[desktop-packaging]]).

## End-user install scripts (`scripts/`)

- `install.sh` (POSIX sh, macOS + Linux) and `install.ps1` (Windows). README one-liners use `https://github.com/prlama55/GuidedReel/raw/main/scripts/...` (redirects to raw.githubusercontent; the URL form is what the scaffolder renames for forks).
- They query `api.github.com/repos/<owner>/<repo>/releases/latest` (or `--version <tag>`); `/latest` also ignores releases flagged **pre-release**, so when it 404s they fall back to the newest non-draft entry in `/releases?per_page=20` (added 2026-10-08 after v0.2.0 was published as a pre-release). They match assets loosely on `arm64|aarch64` / `x64|x86_64|amd64`, download and install: macOS mounts the dmg, copies to `/Applications` (or `~/Applications`), clears `com.apple.quarantine` (not notarized), opens; Linux AppImage → `~/.local/bin` + `.desktop` entry + icon (`--deb` uses apt); Windows runs the NSIS wizard (`-Silent` → `/S`).
- `--file <installer>` installs a local file (offline/testing). The repo URL is one constant (`REPO_URL`/`$RepoUrl`) so forks get their own.
- Nothing can be verified live until a release is published. The macOS path mounts fine (`hdiutil` parsing tested); the full copy step was not executed in-session because the sandbox blocks clearing quarantine.
