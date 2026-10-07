import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPSTREAM } from './constants';
import { run } from './run';

export interface TemplateSource {
  /** Directory containing the template files. */
  dir: string;
  /** True when dot-files are stored with the `_` prefix (embedded snapshot layout). */
  encoded: boolean;
  /** Human-readable origin for the summary. */
  label: string;
  cleanup: () => Promise<void>;
}

export interface ResolveTemplateOptions {
  templateDir?: string;
  ref?: string;
  /** Overrides the GitHub archive URL (tests). */
  archiveUrl?: (ref: string) => string;
}

/** Picks the template: a local directory, a GitHub archive at `ref`, or the embedded snapshot. */
export async function resolveTemplate(opts: ResolveTemplateOptions): Promise<TemplateSource> {
  if (opts.templateDir) {
    const dir = path.resolve(opts.templateDir);
    await assertDir(dir, `Template directory not found: ${dir}`);
    return {
      dir,
      encoded: isEncodedLayout(dir),
      label: `local template ${dir}`,
      cleanup: async () => {},
    };
  }
  if (opts.ref) return downloadTemplate(opts.ref, opts.archiveUrl);

  const dir = embeddedTemplateDir();
  await assertDir(
    dir,
    `Embedded template missing at ${dir}. In a development checkout run "pnpm --filter create-guidedreel build" first.`,
  );
  return { dir, encoded: true, label: 'embedded template', cleanup: async () => {} };
}

export function embeddedTemplateDir(): string {
  // dist/cli.js → ../template (bundled) or src/template.ts → ../template (tests).
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
}

function isEncodedLayout(dir: string): boolean {
  return existsSync(path.join(dir, '_gitignore')) && !existsSync(path.join(dir, '.gitignore'));
}

async function assertDir(dir: string, message: string): Promise<void> {
  try {
    await access(dir);
  } catch {
    throw new Error(message);
  }
}

export function defaultArchiveUrl(ref: string): string {
  return `https://codeload.github.com/${UPSTREAM.owner}/${UPSTREAM.repo}/tar.gz/${encodeURIComponent(ref)}`;
}

async function downloadTemplate(
  ref: string,
  archiveUrl: (ref: string) => string = defaultArchiveUrl,
): Promise<TemplateSource> {
  const work = await mkdtemp(path.join(os.tmpdir(), 'create-guidedreel-'));
  const cleanup = () => rm(work, { recursive: true, force: true });
  try {
    const url = archiveUrl(ref);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Could not download ${url} (${res.status} ${res.statusText}). Check the branch or tag name.`,
      );
    }
    const archive = path.join(work, 'template.tar.gz');
    await writeFile(archive, new Uint8Array(await res.arrayBuffer()));
    const dir = path.join(work, 'template');
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    // GitHub archives wrap everything in "<repo>-<ref>/"; system tar exists on macOS, Linux and Windows 10+.
    await run('tar', ['-xzf', archive, '--strip-components=1', '-C', dir], { cwd: work });
    await rm(archive, { force: true });
    return {
      dir,
      encoded: false,
      label: `GitHub ${UPSTREAM.owner}/${UPSTREAM.repo}@${ref}`,
      cleanup,
    };
  } catch (err) {
    await cleanup();
    throw err;
  }
}
