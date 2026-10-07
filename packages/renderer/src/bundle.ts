import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { bundle, type WebpackOverrideFn } from '@remotion/bundler';
import { createLogger, type Logger } from '@guidedreel/engine';

const require = createRequire(import.meta.url);

/** Absolute path of the compositions bundle entry (TypeScript source, bundled by webpack). */
export function compositionsEntryPoint(): string {
  // Resolved at runtime; bundlers must not follow it (the entry is React code bundled by Remotion's webpack).
  return require.resolve(
    /* turbopackIgnore: true */ /* webpackIgnore: true */ '@guidedreel/compositions/entry',
  );
}

/** Lets webpack resolve `./x.js` imports to `./x.ts(x)` sources, as TypeScript does. */
export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'] },
  },
});

export type EnsureBundleOptions = {
  /** Directory to build into / reuse. */
  outDir: string;
  /** Explicit entry file; defaults to resolving `@guidedreel/compositions/entry` from this package. */
  entryPoint?: string;
  /** Prebuilt bundle (production desktop build). Used as-is when it exists. */
  prebuiltDir?: string;
  /** Rebuild even if a cached bundle exists. */
  force?: boolean;
  onProgress?: (percent: number) => void;
  logger?: Logger;
};

const STAMP = 'bundle-stamp.json';

/**
 * Returns a directory containing the Remotion bundle for the compositions.
 * In production the desktop app ships a prebuilt bundle; in development the
 * bundle is built once and cached until the compositions version changes.
 */
export async function ensureBundle(options: EnsureBundleOptions): Promise<string> {
  const log = options.logger ?? createLogger('bundle', { level: 'info' });
  if (options.prebuiltDir && existsSync(path.join(options.prebuiltDir, 'index.html'))) {
    log.debug('using prebuilt bundle', { dir: options.prebuiltDir });
    return options.prebuiltDir;
  }
  const entry = options.entryPoint ?? compositionsEntryPoint();
  const stampPath = path.join(options.outDir, STAMP);
  // Keyed on the newest source file so edits to scenes invalidate the cache in development.
  const stamp = JSON.stringify({
    entry,
    version: compositionsVersion(),
    sources: await newestMtime(path.dirname(entry)),
  });

  if (
    !options.force &&
    existsSync(path.join(options.outDir, 'index.html')) &&
    existsSync(stampPath)
  ) {
    const existing = await readFile(stampPath, 'utf8').catch(() => '');
    if (existing === stamp) {
      log.debug('using cached bundle', { dir: options.outDir });
      return options.outDir;
    }
  }

  log.info('building Remotion bundle', { entry, outDir: options.outDir });
  await mkdir(options.outDir, { recursive: true });
  const started = Date.now();
  const serveUrl = await bundle({
    entryPoint: entry,
    outDir: options.outDir,
    webpackOverride,
    onProgress: (p) => options.onProgress?.(p),
  });
  await writeFile(stampPath, stamp, 'utf8');
  log.info('bundle ready', { ms: Date.now() - started, serveUrl });
  return serveUrl;
}

/** Newest mtime (ms) under a directory tree; 0 if unreadable. */
async function newestMtime(dir: string): Promise<number> {
  let newest = 0;
  const walk = async (d: string): Promise<void> => {
    const entries = await readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') await walk(full);
      } else {
        const st = await stat(full).catch(() => null);
        if (st && st.mtimeMs > newest) newest = st.mtimeMs;
      }
    }
  };
  await walk(dir);
  return Math.round(newest);
}

function compositionsVersion(): string {
  try {
    const pkg = require(
      /* turbopackIgnore: true */ /* webpackIgnore: true */ '@guidedreel/compositions/package.json',
    ) as { version?: string };
    return pkg.version ?? '0';
  } catch {
    return '0';
  }
}
