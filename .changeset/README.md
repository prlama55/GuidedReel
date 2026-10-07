# Changesets

Every `@guidedreel/*` package and `create-guidedreel` share one version (a _fixed_ group).

- `pnpm changeset` records what changed and whether it is a patch, minor or major.
- `pnpm version-packages` applies pending changesets: bumps versions, writes CHANGELOGs, refreshes the lockfile.
- `pnpm release` builds the packages and publishes everything that is not yet on npm.

The release workflow runs the last two steps on `main`; see `.github/workflows/release-npm.yml`.
