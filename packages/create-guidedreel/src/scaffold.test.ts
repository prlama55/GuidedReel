import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { snapshotRepo } from './snapshot';
import { scaffold } from './scaffold';
import type { ScaffoldOptions } from './options';
import type { TemplateSource } from './template';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let work: string;
let templateDir: string;
let template: TemplateSource;

beforeAll(async () => {
  work = await mkdtemp(path.join(os.tmpdir(), 'create-guidedreel-test-'));
  templateDir = path.join(work, 'template');
  await snapshotRepo({ repoRoot, outDir: templateDir });
  template = { dir: templateDir, encoded: true, label: 'test', cleanup: async () => {} };
});

afterAll(async () => {
  await rm(work, { recursive: true, force: true });
});

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort();
}

async function grepFiles(dir: string, needle: string, skip: string[] = []): Promise<string[]> {
  const hits: string[] = [];
  for (const rel of await listFiles(dir)) {
    if (skip.includes(rel) || /\.(png|jpg|gif|svg|ico)$/.test(rel)) continue;
    const text = await readFile(path.join(dir, rel), 'utf8');
    if (text.includes(needle)) hits.push(rel);
  }
  return hits;
}

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false,
  );

describe('snapshot', () => {
  it('encodes dot-files and excludes non-template paths', async () => {
    const files = await listFiles(templateDir);
    expect(files).toContain('_gitignore');
    expect(files).toContain('_npmrc');
    expect(files).toContain('_pnpm-lock.yaml');
    expect(files).toContain('_github/workflows/ci.yml');
    expect(files).toContain('package.json');
    expect(files).toContain('LICENSE');
    expect(files.some((f) => f.startsWith('docs/examples/'))).toBe(false);
    expect(files.some((f) => f.startsWith('packages/create-guidedreel/'))).toBe(false);
    expect(files).not.toContain('CLAUDE.md');
    expect(files).not.toContain('README.md');
    expect(files.some((f) => f.split('/').some((s) => s.startsWith('.')))).toBe(false);
    const lock = await readFile(path.join(templateDir, '_pnpm-lock.yaml'), 'utf8');
    expect(lock).not.toMatch(/^ {2}packages\/create-guidedreel:$/m);
    expect(lock).toMatch(/^ {2}packages\/ui:$/m);
  });
});

describe('scaffold: both apps, GitHub repo', () => {
  const opts: ScaffoldOptions = {
    mode: 'fork',
    coreVersion: '0.1.0',
    targetDir: '',
    slug: 'acme-studio',
    displayName: 'Acme Studio',
    scope: 'acme',
    apps: { web: true, desktop: true },
    author: 'Ada Lovelace',
    repoUrl: 'https://github.com/acme/acme-studio',
  };
  let target: string;
  beforeAll(async () => {
    target = path.join(work, 'both');
    await scaffold({ ...opts, targetDir: target }, template);
  });

  it('restores dot-files, lockfile and writes a README', async () => {
    expect(await exists(path.join(target, '.gitignore'))).toBe(true);
    expect(await exists(path.join(target, '.npmrc'))).toBe(true);
    expect(await exists(path.join(target, 'pnpm-lock.yaml'))).toBe(true);
    expect(await exists(path.join(target, '.github/workflows/ci.yml'))).toBe(true);
    expect(await exists(path.join(target, '.github/workflows/release.yml'))).toBe(true);
    expect(await exists(path.join(target, '_gitignore'))).toBe(false);
    const readme = await readFile(path.join(target, 'README.md'), 'utf8');
    expect(readme.startsWith('# Acme Studio')).toBe(true);
    expect(readme).toContain('@acme/desktop dist:mac');
  });

  it('renames scope, product, slug, app id and author everywhere except LICENSE', async () => {
    expect(await grepFiles(target, '@guidedreel/')).toEqual([]);
    expect(await grepFiles(target, 'GuidedReel', ['LICENSE', 'README.md'])).toEqual([]);
    expect(await grepFiles(target, 'Padma Raj Lama', ['LICENSE', 'README.md'])).toEqual([]);
    expect(await grepFiles(target, 'prlama55', ['LICENSE', 'README.md'])).toEqual([]);
    const license = await readFile(path.join(target, 'LICENSE'), 'utf8');
    expect(license).toContain('Padma Raj Lama');

    const root = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
    expect(root.name).toBe('acme-studio');
    expect(root.repository.url).toBe('git+https://github.com/acme/acme-studio.git');
    expect(root.author).toEqual({ name: 'Ada Lovelace', url: 'https://github.com/acme' });
    expect(root.devDependencies['@acme/config']).toBe('workspace:*');
    expect(root.scripts['dev:desktop']).toBeDefined();

    const builder = await readFile(path.join(target, 'apps/desktop/electron-builder.yml'), 'utf8');
    expect(builder).toContain('appId: com.acme-studio.app');
    expect(builder).toContain('productName: Acme Studio');
    expect(builder).toContain('owner: acme\n  repo: acme-studio');
    expect(builder).toContain(`Copyright © ${new Date().getFullYear()} Ada Lovelace`);

    const idb = await readFile(
      path.join(target, 'packages/storage/src/browser/indexeddb.ts'),
      'utf8',
    );
    expect(idb).toContain("const DB_NAME = 'acme-studio';");
    const lock = await readFile(path.join(target, 'pnpm-lock.yaml'), 'utf8');
    expect(lock).toContain("'@acme/config':");
    expect(lock).toMatch(/^ {2}apps\/desktop:$/m);
  });

  it('keeps binaries byte-identical', async () => {
    const a = await readFile(path.join(repoRoot, 'apps/desktop/build/icon.png'));
    const b = await readFile(path.join(target, 'apps/desktop/build/icon.png'));
    expect(Buffer.compare(a, b)).toBe(0);
  });

  it('refuses a non-empty directory', async () => {
    await expect(scaffold({ ...opts, targetDir: target }, template)).rejects.toThrow(/not empty/);
  });
});

describe('scaffold: web only, no repo URL', () => {
  const opts: ScaffoldOptions = {
    mode: 'fork',
    coreVersion: '0.1.0',
    targetDir: '',
    slug: 'solo',
    displayName: 'Solo',
    scope: 'solo',
    apps: { web: true, desktop: false },
    author: 'Grace Hopper',
  };
  let target: string;
  beforeAll(async () => {
    target = path.join(work, 'web-only');
    await scaffold({ ...opts, targetDir: target }, template);
  });

  it('drops the desktop app, its workflow, scripts and lockfile importer', async () => {
    expect(await exists(path.join(target, 'apps/desktop'))).toBe(false);
    expect(await exists(path.join(target, 'apps/web/package.json'))).toBe(true);
    expect(await exists(path.join(target, '.github/workflows/release.yml'))).toBe(false);
    const ci = await readFile(path.join(target, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toContain('build-desktop');
    expect(ci).toContain('build-web');
    expect(ci).toContain('render-integration');
    const root = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
    expect(root.scripts['dev:desktop']).toBeUndefined();
    expect(root.scripts['dev:web']).toBeDefined();
    expect(root.repository).toBeUndefined();
    expect(root.homepage).toBeUndefined();
    expect(root.author).toEqual({ name: 'Grace Hopper' });
    const lock = await readFile(path.join(target, 'pnpm-lock.yaml'), 'utf8');
    expect(lock).not.toMatch(/^ {2}apps\/desktop:$/m);
    expect(lock).toMatch(/^ {2}apps\/web:$/m);
  });

  it('keeps upstream documentation links intact and removes author URL from metadata', async () => {
    const layout = await readFile(path.join(target, 'apps/web/src/app/layout.tsx'), 'utf8');
    expect(layout).toContain("authors: [{ name: 'Grace Hopper' }]");
    expect(layout).toContain("applicationName: 'Solo'");
    const readme = await readFile(path.join(target, 'README.md'), 'utf8');
    expect(readme).toContain('https://github.com/prlama55/GuidedReel');
    expect(readme).not.toContain('dist:mac');
    expect(await grepFiles(target, 'prlama55/Solo')).toEqual([]);
  });
});

describe('scaffold: desktop only', () => {
  it('drops web, keeps release workflow, trims vitest workspace', async () => {
    const target = path.join(work, 'desktop-only');
    await scaffold(
      {
        mode: 'fork',
        coreVersion: '0.1.0',
        targetDir: target,
        slug: 'deskonly',
        displayName: 'Desk Only',
        scope: 'deskonly',
        apps: { web: false, desktop: true },
        author: 'Someone',
      },
      template,
    );
    expect(await exists(path.join(target, 'apps/web'))).toBe(false);
    expect(await exists(path.join(target, '.github/workflows/release.yml'))).toBe(true);
    const ci = await readFile(path.join(target, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toContain('build-web');
    expect(ci).toContain('build-desktop');
    expect(await readFile(path.join(target, 'vitest.workspace.ts'), 'utf8')).toContain(
      "['packages/*']",
    );
    const index = await readFile(path.join(target, 'apps/desktop/src/main/index.ts'), 'utf8');
    expect(index).not.toContain('website:');
    const builder = await readFile(path.join(target, 'apps/desktop/electron-builder.yml'), 'utf8');
    expect(builder).not.toContain('publish:');
    expect(builder).toContain('mac:');
  });
});

describe('scaffold: thin app on @guidedreel/core (both apps)', () => {
  const opts: ScaffoldOptions = {
    mode: 'thin',
    coreVersion: '0.3.0',
    targetDir: '',
    slug: 'my-studio',
    displayName: 'My Studio',
    scope: 'mystudio',
    apps: { web: true, desktop: true },
    author: 'Ada Lovelace',
    repoUrl: 'https://github.com/acme/my-studio',
  };
  let target: string;
  beforeAll(async () => {
    target = path.join(work, 'thin-both');
    await scaffold({ ...opts, targetDir: target }, template);
  });

  it('keeps only the app shells, root config and a generated extensions package', async () => {
    const files = await listFiles(target);
    expect(files.some((f) => f.startsWith('packages/schema/'))).toBe(false);
    expect(files.some((f) => f.startsWith('packages/core/'))).toBe(false);
    expect(files.some((f) => f.startsWith('docs/'))).toBe(false);
    expect(files).not.toContain('pnpm-lock.yaml');
    expect(files).not.toContain('LICENSE');
    for (const f of [
      'package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'tsconfig.base.json',
      '.npmrc',
      '.gitignore',
      '.github/workflows/ci.yml',
      'THIRD_PARTY_NOTICES.md',
      'README.md',
      'vitest.workspace.ts',
      'apps/web/package.json',
      'apps/desktop/package.json',
      'packages/extensions/package.json',
      'packages/extensions/src/index.ts',
      'packages/extensions/src/templates/launch-promo.ts',
      'packages/extensions/src/templates.test.ts',
    ]) {
      expect(files, f).toContain(f);
    }
  });

  it('depends on @guidedreel/core from npm and on the local extensions package', async () => {
    const web = JSON.parse(await readFile(path.join(target, 'apps/web/package.json'), 'utf8'));
    expect(web.name).toBe('@mystudio/web');
    expect(web.dependencies['@guidedreel/core']).toBe('^0.3.0');
    expect(web.dependencies['@mystudio/extensions']).toBe('workspace:*');
    expect(web.devDependencies['@guidedreel/config']).toBe('^0.3.0');
    expect(
      Object.keys({ ...web.dependencies, ...web.devDependencies }).some((d) =>
        d.includes('remotion'),
      ),
    ).toBe(false);
    const desktop = JSON.parse(
      await readFile(path.join(target, 'apps/desktop/package.json'), 'utf8'),
    );
    expect(desktop.name).toBe('@mystudio/desktop');
    expect(desktop.dependencies['@guidedreel/core']).toBe('^0.3.0');
    expect(desktop.devDependencies['@mystudio/extensions']).toBe('workspace:*');
    const root = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
    expect(root.name).toBe('my-studio');
    expect(root.scripts['dev:web']).toBe('turbo run dev --filter=@mystudio/web...');
    expect(root.devDependencies['@guidedreel/config']).toBe('^0.3.0');
    const ext = JSON.parse(
      await readFile(path.join(target, 'packages/extensions/package.json'), 'utf8'),
    );
    expect(ext.name).toBe('@mystudio/extensions');
    expect(ext.dependencies['@guidedreel/core']).toBe('^0.3.0');
  });

  it('registers the extensions templates in both shells and transpiles the package in Next', async () => {
    const providers = await readFile(path.join(target, 'apps/web/src/app/providers.tsx'), 'utf8');
    expect(providers).toContain("import { templates } from '@mystudio/extensions';");
    expect(providers).toContain('templateRegistry.registerAll(templates);');
    const app = await readFile(path.join(target, 'apps/desktop/src/renderer/src/App.tsx'), 'utf8');
    expect(app).toContain('templateRegistry.registerAll(templates);');
    const next = await readFile(path.join(target, 'apps/web/next.config.ts'), 'utf8');
    expect(next).toContain("transpilePackages: ['@mystudio/extensions']");
    const tpl = await readFile(
      path.join(target, 'packages/extensions/src/templates/launch-promo.ts'),
      'utf8',
    );
    expect(tpl).toContain("id: 'my-studio-launch-promo'");
  });

  it('keeps the @guidedreel scope for engine packages while renaming product and author', async () => {
    expect(await grepFiles(target, '@mystudio/core')).toEqual([]);
    expect(await grepFiles(target, '@guidedreel/web')).toEqual([]);
    expect(await grepFiles(target, '@guidedreel/desktop')).toEqual([]);
    expect(await grepFiles(target, 'Padma Raj Lama', ['THIRD_PARTY_NOTICES.md'])).toEqual([]);
    const tsconfig = await readFile(path.join(target, 'tsconfig.base.json'), 'utf8');
    expect(tsconfig).toContain('@guidedreel/config/tsconfig/base.json');
    const builder = await readFile(path.join(target, 'apps/desktop/electron-builder.yml'), 'utf8');
    expect(builder).toContain('appId: com.my-studio.app');
    expect(builder).toContain('productName: My Studio');
    const ci = await readFile(path.join(target, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('build-web');
    expect(ci).toContain('build-desktop');
    expect(ci).toContain('@mystudio/desktop exec electron-builder');
  });
});

describe('scaffold: thin app, web only, local tarballs', () => {
  it('installs @guidedreel/* from tarballs via pnpm overrides and omits desktop', async () => {
    const tarballDir = path.join(work, 'tgz');
    await mkdir(tarballDir, { recursive: true });
    for (const name of [
      'guidedreel-core-0.1.0.tgz',
      'guidedreel-schema-0.1.0.tgz',
      'guidedreel-config-0.1.0.tgz',
      'notes.txt',
    ]) {
      await writeFile(path.join(tarballDir, name), '');
    }
    const target = path.join(work, 'thin-web');
    await scaffold(
      {
        mode: 'thin',
        coreVersion: '0.1.0',
        coreTarballs: tarballDir,
        targetDir: target,
        slug: 'webonly',
        displayName: 'Web Only',
        scope: 'webonly',
        apps: { web: true, desktop: false },
        author: 'Grace Hopper',
      },
      template,
    );
    expect(await exists(path.join(target, 'apps/desktop'))).toBe(false);
    const web = JSON.parse(await readFile(path.join(target, 'apps/web/package.json'), 'utf8'));
    expect(web.dependencies['@guidedreel/core']).toBe('^0.1.0');
    const ws = await readFile(path.join(target, 'pnpm-workspace.yaml'), 'utf8');
    expect(ws.match(/^overrides:$/gm)?.length).toBe(1);
    expect(ws).toContain(
      `'@guidedreel/core': 'file:${path.join(tarballDir, 'guidedreel-core-0.1.0.tgz')}'`,
    );
    expect(ws).toContain(`'@guidedreel/schema': 'file:`);
    expect(ws).toContain("'get-stream@5': ^6.0.1");
    const root = JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8'));
    expect(root.scripts['dev:desktop']).toBeUndefined();
    expect(root.scripts['build:web']).toBeDefined();
    const ci = await readFile(path.join(target, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toContain('build-desktop');
    const readme = await readFile(path.join(target, 'README.md'), 'utf8');
    expect(readme).toContain('## Add a template');
    expect(readme).not.toContain('dist:mac');
  });
});
