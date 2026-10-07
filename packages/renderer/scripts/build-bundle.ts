// Builds the production Remotion bundle for the compositions package.
// Usage: tsx scripts/build-bundle.ts <outDir>
import path from 'node:path';
import { ensureBundle } from '../src/bundle';

const outDir = path.resolve(process.argv[2] ?? '.remotion-bundle');
const dir = await ensureBundle({
  outDir,
  force: true,
  onProgress: (p) => process.stdout.write(`\rbundling ${p}%`),
});
process.stdout.write(`\nbundle written to ${dir}\n`);
