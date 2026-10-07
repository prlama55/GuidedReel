import { parseArgs } from 'node:util';
import path from 'node:path';

export interface AppSelection {
  web: boolean;
  desktop: boolean;
}

/**
 * `thin` (default): a new app that depends on `@guidedreel/core` from npm, with its own
 * `packages/extensions` for templates. `fork`: a renamed copy of the whole engine monorepo.
 */
export type ScaffoldMode = 'thin' | 'fork';

/** Fully resolved answers that drive the scaffold step. */
export interface ScaffoldOptions {
  mode: ScaffoldMode;
  /** Absolute path of the new project. */
  targetDir: string;
  /** Version of @guidedreel/core (and @guidedreel/config) to depend on in thin mode. */
  coreVersion: string;
  /**
   * Thin mode only: directory of `.tgz` files from `pnpm -r pack` of the GuidedReel packages. They are
   * installed through pnpm `overrides` instead of npm, for testing before a release.
   */
  coreTarballs?: string;
  /** Root package name, IndexedDB name, temp folders, app id: `my-studio`. */
  slug: string;
  /** Product name shown in the UI, window titles and metadata: `My Studio`. */
  displayName: string;
  /** Workspace package scope without the `@`: `my-studio` → `@my-studio/engine`. */
  scope: string;
  apps: AppSelection;
  /** Replaces the upstream author in UI credits, copyright and package metadata. */
  author: string;
  /** Optional project repository URL; GitHub URLs also feed electron-builder's publish config. */
  repoUrl?: string;
}

export interface CliArgs {
  dir?: string;
  name?: string;
  scope?: string;
  apps?: AppSelection;
  author?: string;
  repo?: string;
  templateDir?: string;
  ref?: string;
  fork: boolean;
  coreTarballs?: string;
  install: boolean;
  git: boolean;
  yes: boolean;
  help: boolean;
  version: boolean;
}

export const HELP = `Usage: create-guidedreel [directory] [options]

Creates a new video creator app on top of @guidedreel/core: a Next.js web app and/or an
Electron desktop app, plus a packages/extensions workspace where you register your own
templates. The app never touches Remotion directly. No git clone needed.

Options:
  --fork                 Instead of an app on @guidedreel/core, copy the whole GuidedReel
                         monorepo (engine packages included) to modify the engine itself
  --core-tarballs <dir>  App mode: install the @guidedreel/* packages from .tgz files in <dir>
                         (made with "pnpm -r --filter './packages/*' pack") instead of npm
  --name <text>          Product name shown in the app (default: from directory)
  --scope <name>         Package scope without "@" (default: directory slug)
  --apps <list>          web, desktop or web,desktop (default: both)
  --author <text>        Author for credits and copyright (default: git user.name)
  --repo <url>           Repository URL for package.json and release config
  --ref <git-ref>        Download the template from GitHub at this branch or tag
                         instead of using the embedded copy (needs network + tar)
  --template-dir <path>  Use a local template directory (for development)
  --no-install           Skip "pnpm install"
  --no-git               Skip "git init" and the first commit
  -y, --yes              Accept defaults; never prompt
  -h, --help             Show this help
  -v, --version          Show the version

Examples:
  pnpm create guidedreel my-studio
  npx create-guidedreel my-studio --apps web --scope acme --name "Acme Studio" -y
`;

export function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      scope: { type: 'string' },
      apps: { type: 'string' },
      author: { type: 'string' },
      repo: { type: 'string' },
      ref: { type: 'string' },
      'template-dir': { type: 'string' },
      fork: { type: 'boolean' },
      'core-tarballs': { type: 'string' },
      install: { type: 'boolean' },
      'no-install': { type: 'boolean' },
      git: { type: 'boolean' },
      'no-git': { type: 'boolean' },
      yes: { type: 'boolean', short: 'y' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  if (positionals.length > 1)
    throw new Error(`Unexpected arguments: ${positionals.slice(1).join(' ')}`);
  return {
    dir: positionals[0],
    name: values.name,
    scope: values.scope,
    apps: values.apps === undefined ? undefined : parseApps(values.apps),
    author: values.author,
    repo: values.repo,
    templateDir: values['template-dir'],
    ref: values.ref,
    fork: values.fork ?? false,
    coreTarballs: values['core-tarballs'],
    install: !values['no-install'],
    git: !values['no-git'],
    yes: values.yes ?? false,
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

export function parseApps(input: string): AppSelection {
  const parts = input
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.includes('both') || parts.includes('all')) return { web: true, desktop: true };
  const selection = { web: parts.includes('web'), desktop: parts.includes('desktop') };
  const unknown = parts.filter((p) => p !== 'web' && p !== 'desktop');
  if (unknown.length > 0)
    throw new Error(`Unknown app "${unknown[0]}". Use web, desktop or web,desktop.`);
  if (!selection.web && !selection.desktop)
    throw new Error('Select at least one app (web, desktop).');
  return selection;
}

/** `My Video Studio` → `my-video-studio`. */
export function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** `my-video-studio` → `My Video Studio`. */
export function toDisplayName(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function slugFromDirectory(dir: string): string {
  return toSlug(path.basename(path.resolve(dir)));
}

export function validateSlug(slug: string): string | undefined {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return 'Use lowercase letters, digits and hyphens only.';
  if (slug.length > 64) return 'Keep it under 64 characters.';
  return undefined;
}

export function validateScope(scope: string): string | undefined {
  const bare = scope.startsWith('@') ? scope.slice(1) : scope;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(bare))
    return 'Scope: lowercase letters, digits, "-", "." or "_".';
  return undefined;
}

export function normalizeScope(scope: string): string {
  return scope.trim().replace(/^@/, '').replace(/\/$/, '');
}

/** Rejects characters that would break the string literals the name is substituted into. */
export function validateText(value: string, label: string): string | undefined {
  if (value.trim() === '') return `${label} is required.`;
  if (/['"`\\\n\r<>]/.test(value))
    return `${label} must not contain quotes, backslashes or angle brackets.`;
  return undefined;
}

export function normalizeRepoUrl(input: string | undefined): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) return undefined;
  let url = trimmed.replace(/\/+$/, '').replace(/\.git$/, '');
  const ssh = url.match(/^git@([^:]+):(.+)$/);
  if (ssh) url = `https://${ssh[1]}/${ssh[2]}`;
  if (!/^https?:\/\//.test(url))
    throw new Error(`Repository URL must start with https:// (got "${input}").`);
  return url;
}

export function parseGithubRepo(
  url: string | undefined,
): { owner: string; repo: string } | undefined {
  const m = url?.match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/);
  return m ? { owner: m[1]!, repo: m[2]! } : undefined;
}

/** Owner URL (`https://github.com/acme`) when the repo URL is a GitHub repo. */
export function ownerUrlFrom(repoUrl: string | undefined): string | undefined {
  const gh = parseGithubRepo(repoUrl);
  return gh ? `https://github.com/${gh.owner}` : undefined;
}
