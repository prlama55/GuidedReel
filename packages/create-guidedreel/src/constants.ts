/** Identity of the upstream project that the template is snapshotted from. */
export const UPSTREAM = {
  repoUrl: 'https://github.com/prlama55/GuidedReel',
  ownerUrl: 'https://github.com/prlama55',
  owner: 'prlama55',
  repo: 'GuidedReel',
  displayName: 'GuidedReel',
  slug: 'guidedreel',
  scope: 'guidedreel',
  appId: 'com.guidedreel.app',
  author: 'Padma Raj Lama',
} as const;

/**
 * Repository paths that never end up in a generated project (POSIX, relative to the
 * repo root; directories end with "/"). The README is replaced by a generated one.
 */
export const EXCLUDED_PATHS: readonly string[] = [
  'CLAUDE.md',
  'README.md',
  'docs/examples/',
  'docs/branding/',
  'tooling/',
  'packages/create-guidedreel/',
];

/** Files copied verbatim: no name or author rewriting. */
export const VERBATIM_PATHS: readonly string[] = ['LICENSE'];

export const LOCKFILE = 'pnpm-lock.yaml';

/** Root files a thin app keeps from the monorepo (everything else is generated or dropped). */
export const THIN_ROOT_FILES: readonly string[] = [
  '.gitignore',
  '.npmrc',
  '.prettierrc',
  '.prettierignore',
  '.env.example',
  'tsconfig.base.json',
  'turbo.json',
  'eslint.config.js',
  'pnpm-workspace.yaml',
];
export const CREATE_PACKAGE_IMPORTER = 'packages/create-guidedreel';

/** Extensions treated as binary without sniffing. */
export const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.icns',
  '.mp4',
  '.mp3',
  '.wav',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.onnx',
  '.zip',
  '.pdf',
]);
