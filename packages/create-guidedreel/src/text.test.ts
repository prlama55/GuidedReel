import { describe, expect, it } from 'vitest';
import { removeIndentedBlock, removeLines, replaceAll, isProbablyBinary } from './text';
import { decodeTemplatePath, encodeTemplatePath, matchesPathList } from './paths';
import {
  normalizeRepoUrl,
  normalizeScope,
  ownerUrlFrom,
  parseApps,
  parseCliArgs,
  toDisplayName,
  toSlug,
  validateScope,
  validateSlug,
  validateText,
} from './options';

describe('removeIndentedBlock', () => {
  const yaml = `jobs:
  checks:
    runs-on: ubuntu-latest

  build-desktop:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [a, b]

  build-web:
    runs-on: ubuntu-latest
`;
  it('removes a middle block and keeps one blank separator', () => {
    const out = removeIndentedBlock(yaml, 'build-desktop');
    expect(out).toBe(`jobs:
  checks:
    runs-on: ubuntu-latest

  build-web:
    runs-on: ubuntu-latest
`);
  });
  it('removes the last block', () => {
    const out = removeIndentedBlock(yaml, 'build-web');
    expect(out).toContain('build-desktop');
    expect(out).not.toContain('build-web');
    expect(out.endsWith('os: [a, b]\n')).toBe(true);
  });
  it('is a no-op for unknown keys and ignores partial matches', () => {
    expect(removeIndentedBlock(yaml, 'nope')).toBe(yaml);
    expect(removeIndentedBlock(yaml, 'build')).toBe(yaml);
  });
  it('handles pnpm-lock importers', () => {
    const lock = `importers:\n\n  .:\n    devDependencies:\n      x: 1\n\n  apps/desktop:\n    dependencies:\n      y: 2\n\n  packages/ui:\n    dependencies:\n      z: 3\n\npackages:\n\n  foo@1: {}\n`;
    const out = removeIndentedBlock(lock, 'apps/desktop');
    expect(out).toBe(
      `importers:\n\n  .:\n    devDependencies:\n      x: 1\n\n  packages/ui:\n    dependencies:\n      z: 3\n\npackages:\n\n  foo@1: {}\n`,
    );
  });
});

describe('text helpers', () => {
  it('removeLines drops matching lines only', () => {
    expect(removeLines("a\n  website: 'x',\nb", /^\s*website: '[^']*',\s*$/)).toBe('a\nb');
  });
  it('replaceAll applies pairs in order', () => {
    expect(
      replaceAll('@guidedreel/ui GuidedReel guidedreel', [
        ['@guidedreel/', '@acme/'],
        ['GuidedReel', 'Acme'],
        ['guidedreel', 'acme'],
      ]),
    ).toBe('@acme/ui Acme acme');
  });
  it('detects binaries by extension or NUL byte', () => {
    expect(isProbablyBinary('a.png', new Uint8Array([1, 2]))).toBe(true);
    expect(isProbablyBinary('a.ts', new Uint8Array([104, 0, 105]))).toBe(true);
    expect(isProbablyBinary('a.ts', new Uint8Array([104, 105]))).toBe(false);
  });
});

describe('template paths', () => {
  it('round-trips dot-files and the lockfile', () => {
    for (const rel of [
      '.gitignore',
      '.github/workflows/ci.yml',
      'apps/web/.env.example',
      'pnpm-lock.yaml',
      'src/a.ts',
    ]) {
      const enc = encodeTemplatePath(rel);
      expect(enc.split('/').every((s) => !s.startsWith('.'))).toBe(true);
      expect(enc).not.toBe('pnpm-lock.yaml');
      expect(decodeTemplatePath(enc)).toBe(rel);
    }
    expect(encodeTemplatePath('.github/workflows/ci.yml')).toBe('_github/workflows/ci.yml');
  });
  it('matches files and directory prefixes', () => {
    expect(matchesPathList('docs/examples/a.mp4', ['docs/examples/'])).toBe(true);
    expect(matchesPathList('docs/examples', ['docs/examples/'])).toBe(false);
    expect(matchesPathList('CLAUDE.md', ['CLAUDE.md'])).toBe(true);
    expect(matchesPathList('CLAUDE.md.bak', ['CLAUDE.md'])).toBe(false);
  });
});

describe('options', () => {
  it('slugs and display names', () => {
    expect(toSlug('My Video  Studio!')).toBe('my-video-studio');
    expect(toDisplayName('my-video-studio')).toBe('My Video Studio');
    expect(validateSlug('ok-1')).toBeUndefined();
    expect(validateSlug('-bad')).toBeDefined();
    expect(validateScope('@acme')).toBeUndefined();
    expect(normalizeScope('@acme/')).toBe('acme');
    expect(validateText("Bob's", 'Name')).toBeDefined();
    expect(validateText('Bob', 'Name')).toBeUndefined();
  });
  it('parses apps', () => {
    expect(parseApps('web')).toEqual({ web: true, desktop: false });
    expect(parseApps('web, desktop')).toEqual({ web: true, desktop: true });
    expect(parseApps('both')).toEqual({ web: true, desktop: true });
    expect(() => parseApps('ios')).toThrow();
  });
  it('normalizes repository URLs', () => {
    expect(normalizeRepoUrl('https://github.com/acme/studio.git/')).toBe(
      'https://github.com/acme/studio',
    );
    expect(normalizeRepoUrl('git@github.com:acme/studio.git')).toBe(
      'https://github.com/acme/studio',
    );
    expect(normalizeRepoUrl('')).toBeUndefined();
    expect(() => normalizeRepoUrl('acme/studio')).toThrow();
    expect(ownerUrlFrom('https://github.com/acme/studio')).toBe('https://github.com/acme');
    expect(ownerUrlFrom('https://gitlab.com/acme/studio')).toBeUndefined();
  });
  it('parses CLI args', () => {
    const a = parseCliArgs([
      'my-app',
      '--apps',
      'web',
      '--no-install',
      '-y',
      '--scope',
      '@acme',
      '--core-tarballs',
      '../tgz',
    ]);
    expect(a.dir).toBe('my-app');
    expect(a.apps).toEqual({ web: true, desktop: false });
    expect(a.install).toBe(false);
    expect(a.git).toBe(true);
    expect(a.yes).toBe(true);
    expect(a.scope).toBe('@acme');
    expect(a.fork).toBe(false);
    expect(a.coreTarballs).toBe('../tgz');
    expect(parseCliArgs(['x', '--fork']).fork).toBe(true);
    expect(() => parseCliArgs(['a', 'b'])).toThrow();
  });
});
