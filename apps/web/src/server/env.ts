import path from 'node:path';

export const env = {
  workDir: process.env.RENDER_WORK_DIR
    ? path.resolve(/* turbopackIgnore: true */ process.env.RENDER_WORK_DIR)
    : path.join(process.cwd(), '.render'),
  concurrency: Math.max(1, Number(process.env.RENDER_CONCURRENCY ?? 1) || 1),
  maxAssetBytes: Number(process.env.MAX_ASSET_SIZE_BYTES ?? 500 * 1024 * 1024) || 500 * 1024 * 1024,
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
