# @guidedreel/schema

## 0.2.0

### Minor Changes

- Packages are now built to `dist/` with tsup and published to npm. New `@guidedreel/core`
  umbrella package with `ui`, `render`, `storage`, `providers` and `styles.css` subpaths; the web
  and desktop apps depend on it alone and no longer list Remotion.
