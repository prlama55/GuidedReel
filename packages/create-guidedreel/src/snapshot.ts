import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { CREATE_PACKAGE_IMPORTER, EXCLUDED_PATHS, LOCKFILE } from './constants';
import { encodeTemplatePath, matchesPathList } from './paths';
import { removeIndentedBlock } from './text';

const execFileAsync = promisify(execFile);

export interface SnapshotOptions {
  /** Monorepo root (a git checkout). */
  repoRoot: string;
  /** Output directory; recreated from scratch. */
  outDir: string;
}

export interface SnapshotResult {
  files: string[];
}

/**
 * Builds the embedded template from the files git tracks in the monorepo (so build output,
 * node_modules and local files never leak in), minus the paths a new project should not
 * carry. Dot-prefixed segments are renamed so npm keeps them when the package is published.
 */
export async function snapshotRepo({ repoRoot, outDir }: SnapshotOptions): Promise<SnapshotResult> {
  const tracked = await listTrackedFiles(repoRoot);
  const files = tracked.filter((rel) => !matchesPathList(rel, EXCLUDED_PATHS));

  const underscored = files.filter((rel) => rel.split('/').some((s) => s.startsWith('_')));
  if (underscored.length > 0) {
    throw new Error(
      `Tracked paths starting with "_" would collide with the template's dot-file encoding:\n` +
        underscored.map((p) => `  ${p}`).join('\n'),
    );
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const rel of files) {
    const from = path.join(repoRoot, rel);
    const to = path.join(outDir, encodeTemplatePath(rel));
    await mkdir(path.dirname(to), { recursive: true });
    if (rel === LOCKFILE) {
      // The CLI package itself is not part of a generated project.
      const lock = await readFile(from, 'utf8');
      await writeFile(to, removeIndentedBlock(lock, CREATE_PACKAGE_IMPORTER));
    } else {
      await copyFile(from, to);
    }
  }
  return { files };
}

async function listTrackedFiles(repoRoot: string): Promise<string[]> {
  // Tracked plus untracked-but-not-ignored files: the working tree as it would be committed.
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: repoRoot,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return [...new Set(stdout.split('\0').filter(Boolean))].sort();
}
