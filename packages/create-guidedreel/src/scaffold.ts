import { chmod, mkdir, open, readdir, readFile, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import {
  EXCLUDED_PATHS,
  LOCKFILE,
  THIN_ROOT_FILES,
  UPSTREAM,
  VERBATIM_PATHS,
  CREATE_PACKAGE_IMPORTER,
} from './constants';
import { ownerUrlFrom, parseGithubRepo, type ScaffoldOptions } from './options';
import { decodeTemplatePath, matchesPathList, toPosix } from './paths';
import { renderForkReadme, renderThinReadme } from './readme';
import { isProbablyBinary, removeIndentedBlock, removeLines, replaceAll } from './text';
import type { TemplateSource } from './template';
import {
  appendOverrides,
  corePackageSpec,
  tarballOverrides,
  thinCiWorkflow,
  thinClaudeFiles,
  thinExtensionsFiles,
  thinRootPackageJson,
  thirdPartyNotices,
} from './thin';

export interface ScaffoldResult {
  /** Number of files written. */
  files: number;
  /** Relative paths of files removed because an app was deselected. */
  skippedApps: string[];
}

const URL_TOKEN = '\u0000REPO_URL\u0000';
const OWNER_TOKEN = '\u0000OWNER_URL\u0000';
const SCOPE_TOKEN = '\u0000UPSTREAM_SCOPE\u0000';

/** Copies the template into `opts.targetDir`, renaming identity and pruning what the mode drops. */
export async function scaffold(
  opts: ScaffoldOptions,
  template: TemplateSource,
): Promise<ScaffoldResult> {
  await assertTargetUsable(opts.targetDir);
  const tarballs = opts.coreTarballs ? await listTarballDir(opts.coreTarballs) : [];
  if (opts.coreTarballs && !tarballs.some((f) => f.endsWith('.tgz'))) {
    throw new Error(
      `No .tgz files in ${opts.coreTarballs}. Create them with: pnpm -r --filter './packages/*' pack --pack-destination <dir>`,
    );
  }
  const transformer = createTransformer(opts, tarballs);

  const entries = await readdir(template.dir, { recursive: true, withFileTypes: true });
  let files = 0;
  const skippedApps: string[] = [];
  let upstreamRootPackage: Record<string, unknown> = {};
  let licenseText = '';

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absFrom = path.join(entry.parentPath, entry.name);
    const encodedRel = toPosix(path.relative(template.dir, absFrom));
    const rel = template.encoded ? decodeTemplatePath(encodedRel) : encodedRel;

    if (opts.mode === 'thin') {
      if (rel === 'package.json') upstreamRootPackage = JSON.parse(await readFile(absFrom, 'utf8'));
      if (rel === 'LICENSE') licenseText = await readFile(absFrom, 'utf8');
    }
    if (matchesPathList(rel, EXCLUDED_PATHS)) continue;
    if (isDeselectedAppPath(rel, opts)) {
      skippedApps.push(rel);
      continue;
    }
    if (opts.mode === 'thin' && !isThinPath(rel, opts)) continue;

    const absTo = path.join(opts.targetDir, ...rel.split('/'));
    await mkdir(path.dirname(absTo), { recursive: true });

    if (matchesPathList(rel, VERBATIM_PATHS) || (await isBinaryFile(absFrom))) {
      await copyFile(absFrom, absTo);
    } else {
      const source = await readFile(absFrom, 'utf8');
      await writeFile(absTo, transformer(rel, source));
      await chmod(absTo, (await stat(absFrom)).mode);
    }
    files++;
  }

  const generated: Record<string, string> =
    opts.mode === 'thin'
      ? {
          'package.json': thinRootPackageJson(opts, upstreamRootPackage),
          'vitest.workspace.ts': "export default ['packages/*'];\n",
          '.github/workflows/ci.yml': thinCiWorkflow(opts),
          'THIRD_PARTY_NOTICES.md': thirdPartyNotices(licenseText),
          'README.md': renderThinReadme(opts),
          ...thinExtensionsFiles(opts),
          ...thinClaudeFiles(opts),
        }
      : { 'README.md': renderForkReadme(opts) };
  for (const [rel, content] of Object.entries(generated)) {
    const absTo = path.join(opts.targetDir, ...rel.split('/'));
    await mkdir(path.dirname(absTo), { recursive: true });
    await writeFile(absTo, content);
    files++;
  }
  return { files, skippedApps };
}

async function listTarballDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `--core-tarballs: directory not found: ${dir}\n` +
          `Create it from the GuidedReel checkout first:\n` +
          `  pnpm build:packages\n` +
          `  pnpm -r --filter './packages/*' --filter '!create-guidedreel' pack --pack-destination ${dir}`,
        { cause: err },
      );
    }
    throw err;
  }
}

async function assertTargetUsable(dir: string): Promise<void> {
  let existing: string[];
  try {
    existing = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await mkdir(dir, { recursive: true });
      return;
    }
    throw err;
  }
  const meaningful = existing.filter((name) => name !== '.DS_Store');
  if (meaningful.length > 0) {
    throw new Error(`Directory "${dir}" is not empty. Choose a new or empty directory.`);
  }
}

function isDeselectedAppPath(rel: string, opts: ScaffoldOptions): boolean {
  if (!opts.apps.web && rel.startsWith('apps/web/')) return true;
  if (!opts.apps.desktop && rel.startsWith('apps/desktop/')) return true;
  // The release workflow only builds desktop installers.
  if (!opts.apps.desktop && rel === '.github/workflows/release.yml') return true;
  return false;
}

/** Thin apps keep the app shells and a handful of root config files; the engine packages come from npm. */
function isThinPath(rel: string, opts: ScaffoldOptions): boolean {
  if (rel.startsWith('apps/web/')) return opts.apps.web;
  if (rel.startsWith('apps/desktop/')) return opts.apps.desktop;
  return THIN_ROOT_FILES.includes(rel);
}

async function isBinaryFile(file: string): Promise<boolean> {
  const handle = await open(file, 'r');
  try {
    const buf = new Uint8Array(8000);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    return isProbablyBinary(file, buf.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

type Transformer = (rel: string, source: string) => string;

/**
 * Builds the per-file text transform: structural edits first (while upstream strings are
 * still present), then the global identity substitutions. Upstream URLs are protected from
 * the display-name substitution so documentation links stay valid when no repo URL is given.
 * In thin mode `@guidedreel/core` and `@guidedreel/config` are npm packages and keep their
 * scope; only the app packages move to the new scope.
 */
export function createTransformer(opts: ScaffoldOptions, tarballs: string[] = []): Transformer {
  const ownerUrl = ownerUrlFrom(opts.repoUrl);
  const github = parseGithubRepo(opts.repoUrl);
  const year = new Date().getFullYear();
  const thin = opts.mode === 'thin';

  const scopeRenames: ReadonlyArray<readonly [string, string]> = thin
    ? [
        [`@${UPSTREAM.scope}/web`, `@${opts.scope}/web`],
        [`@${UPSTREAM.scope}/desktop`, `@${opts.scope}/desktop`],
        [`@${UPSTREAM.scope}/`, SCOPE_TOKEN],
      ]
    : [[`@${UPSTREAM.scope}/`, `@${opts.scope}/`]];

  const identity: ReadonlyArray<readonly [string, string]> = [
    [UPSTREAM.repoUrl, URL_TOKEN],
    [UPSTREAM.ownerUrl, OWNER_TOKEN],
    ...scopeRenames,
    [UPSTREAM.appId, `com.${opts.slug}.app`],
    [UPSTREAM.displayName, opts.displayName],
    [UPSTREAM.slug, opts.slug],
    [UPSTREAM.author, opts.author],
    [SCOPE_TOKEN, `@${UPSTREAM.scope}/`],
    [URL_TOKEN, opts.repoUrl ?? UPSTREAM.repoUrl],
    [OWNER_TOKEN, ownerUrl ?? opts.repoUrl ?? UPSTREAM.ownerUrl],
  ];

  const copyrightYear = (text: string) => text.replace(/Copyright © \d{4}/, `Copyright © ${year}`);
  const registerTemplates = (text: string) =>
    text.replace(
      `import { templateRegistry } from '@${UPSTREAM.scope}/core';\n`,
      `import { templateRegistry } from '@${UPSTREAM.scope}/core';\nimport { templates } from '@${opts.scope}/extensions';\n\n// Your templates (packages/extensions) join the built-in ones.\ntemplateRegistry.registerAll(templates);\n`,
    );

  const structural: Record<string, (text: string) => string> = {
    'package.json': (text) => editRootPackageJson(text, opts, ownerUrl),
    'apps/desktop/package.json': (text) => editAppPackageJson(text, opts, ownerUrl, 'apps/desktop'),
    'apps/web/package.json': (text) => editAppPackageJson(text, opts, ownerUrl, 'apps/web'),
    'apps/desktop/electron-builder.yml': (text) => {
      let out = copyrightYear(text);
      out = github
        ? out.replace(/owner: .*\n(\s*)repo: .*/, `owner: ${github.owner}\n$1repo: ${github.repo}`)
        : removeIndentedBlock(out, 'publish');
      return out;
    },
    'apps/desktop/scripts/dev.mjs': copyrightYear,
    'apps/desktop/src/main/app-info.ts': copyrightYear,
    'apps/desktop/src/main/index.ts': (text) =>
      opts.repoUrl ? text : removeLines(text, /^\s*website: '[^']*',\s*$/),
    'apps/web/src/app/layout.tsx': (text) =>
      ownerUrl ? text : text.replace(`, url: '${UPSTREAM.ownerUrl}'`, ''),
    'apps/web/next.config.ts': (text) =>
      thin
        ? text.replace(
            '  reactStrictMode: true,\n',
            `  reactStrictMode: true,\n  // Your templates package is TypeScript source inside this workspace.\n  transpilePackages: ['@${opts.scope}/extensions'],\n`,
          )
        : text,
    'apps/web/src/app/providers.tsx': (text) => (thin ? registerTemplates(text) : text),
    'apps/desktop/src/renderer/src/App.tsx': (text) => (thin ? registerTemplates(text) : text),
    '.github/workflows/ci.yml': (text) => {
      let out = text;
      if (!opts.apps.desktop) out = removeIndentedBlock(out, 'build-desktop');
      if (!opts.apps.web) out = removeIndentedBlock(out, 'build-web');
      return out;
    },
    'vitest.workspace.ts': (text) => (opts.apps.web ? text : text.replace(", 'apps/web'", '')),
    [LOCKFILE]: (text) => {
      let out = removeIndentedBlock(text, CREATE_PACKAGE_IMPORTER);
      if (!opts.apps.desktop) out = removeIndentedBlock(out, 'apps/desktop');
      if (!opts.apps.web) out = removeIndentedBlock(out, 'apps/web');
      return out;
    },
  };

  return (rel, source) => {
    const edit = structural[rel];
    const edited = edit ? edit(source) : source;
    const out = replaceAll(edited, identity);
    // Tarball paths contain the upstream slug, so the overrides go in after the renames.
    if (rel === 'pnpm-workspace.yaml' && thin && opts.coreTarballs) {
      return appendOverrides(out, tarballOverrides(opts.coreTarballs, tarballs));
    }
    return out;
  };
}

type PackageJson = Record<string, unknown> & {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function editRootPackageJson(
  text: string,
  opts: ScaffoldOptions,
  ownerUrl: string | undefined,
): string {
  const pkg = JSON.parse(text) as PackageJson;
  pkg['name'] = opts.slug;
  pkg['description'] = `${opts.displayName}: script-to-video creator built on Remotion.`;
  pkg['keywords'] = [
    'video-editor',
    'remotion',
    'nextjs',
    'electron',
    'react',
    'typescript',
    'monorepo',
  ];
  applyMetadata(pkg, opts, ownerUrl);
  if (pkg.scripts) {
    const drop = [
      ...(opts.apps.web ? [] : ['dev:web', 'build:web', 'test:e2e']),
      ...(opts.apps.desktop ? [] : ['dev:desktop', 'build:desktop']),
    ];
    for (const key of drop) delete pkg.scripts[key];
  }
  return stringify(pkg);
}

function editAppPackageJson(
  text: string,
  opts: ScaffoldOptions,
  ownerUrl: string | undefined,
  appDir: 'apps/web' | 'apps/desktop',
): string {
  const pkg = JSON.parse(text) as PackageJson;
  if (typeof pkg['description'] === 'string') {
    pkg['description'] = (pkg['description'] as string).replace(/,\s*developed by .*$/i, '');
  }
  applyMetadata(pkg, opts, ownerUrl);
  if (opts.mode === 'thin') {
    const core = `@${UPSTREAM.scope}/core`;
    const config = `@${UPSTREAM.scope}/config`;
    pkg.dependencies ??= {};
    pkg.devDependencies ??= {};
    if (pkg.dependencies[core]) pkg.dependencies[core] = corePackageSpec(opts);
    if (pkg.devDependencies[config]) pkg.devDependencies[config] = corePackageSpec(opts);
    // The desktop renderer bundles it with Vite, so a devDependency keeps it out of the packaged node_modules.
    const target = appDir === 'apps/web' ? pkg.dependencies : pkg.devDependencies;
    target[`@${opts.scope}/extensions`] = 'workspace:*';
    pkg.dependencies = sortKeys(pkg.dependencies);
    pkg.devDependencies = sortKeys(pkg.devDependencies);
  }
  return stringify(pkg);
}

function applyMetadata(
  pkg: PackageJson,
  opts: ScaffoldOptions,
  ownerUrl: string | undefined,
): void {
  if ('author' in pkg)
    pkg['author'] = ownerUrl ? { name: opts.author, url: ownerUrl } : { name: opts.author };
  for (const key of ['homepage', 'repository', 'bugs'] as const) {
    if (!(key in pkg)) continue;
    if (!opts.repoUrl) {
      delete pkg[key];
      continue;
    }
    if (key === 'homepage') pkg[key] = `${opts.repoUrl}#readme`;
    if (key === 'repository') pkg[key] = { type: 'git', url: `git+${opts.repoUrl}.git` };
    if (key === 'bugs') pkg[key] = { url: `${opts.repoUrl}/issues` };
  }
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

function stringify(pkg: PackageJson): string {
  return `${JSON.stringify(pkg, null, 2)}\n`;
}
