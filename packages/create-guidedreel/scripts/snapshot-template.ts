import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotRepo } from '../src/snapshot';

// packages/create-guidedreel/scripts → repo root
const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pkgDir, '..', '..');
const outDir = path.join(pkgDir, 'template');

const { files } = await snapshotRepo({ repoRoot, outDir });
process.stdout.write(
  `Snapshotted ${files.length} tracked files into ${path.relative(repoRoot, outDir)}\n`,
);
