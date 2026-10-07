// Prebuilds the Remotion bundle shipped inside the packaged app (extraResources in electron-builder.yml).
// Usage: tsx scripts/build-bundle.ts <outDir>
import path from 'node:path';
import { ensureBundle } from '@guidedreel/core/render';

async function main() {
  const outDir = path.resolve(process.argv[2] ?? 'resources/remotion-bundle');
  const dir = await ensureBundle({
    outDir,
    force: true,
    onProgress: (p) => process.stdout.write(`\rbundling ${p}%`),
  });
  process.stdout.write(`\nbundle written to ${dir}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
