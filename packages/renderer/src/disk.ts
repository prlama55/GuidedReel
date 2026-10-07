import { statfs } from 'node:fs/promises';
import path from 'node:path';
import { VideoCreatorError } from '@guidedreel/engine';

/** Free bytes on the volume that contains `targetPath` (or its nearest existing parent). */
export async function freeDiskBytes(targetPath: string): Promise<number | null> {
  let dir = path.resolve(targetPath);
  for (let i = 0; i < 10; i++) {
    try {
      const s = await statfs(dir);
      return Number(s.bavail) * Number(s.bsize);
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
  return null;
}

/** Very rough upper bound for an H.264 file: ~1.5 MB per second at 1080p plus frame cache headroom. */
export function estimateOutputBytes(
  totalFrames: number,
  fps: number,
  width: number,
  height: number,
): number {
  const seconds = totalFrames / fps;
  const pixelFactor = (width * height) / (1920 * 1080);
  return Math.ceil(seconds * 1.5 * 1024 * 1024 * Math.max(0.25, pixelFactor)) + 200 * 1024 * 1024;
}

export async function assertDiskSpace(outputPath: string, requiredBytes: number): Promise<void> {
  const free = await freeDiskBytes(outputPath);
  if (free !== null && free < requiredBytes) {
    throw new VideoCreatorError(
      'INSUFFICIENT_DISK_SPACE',
      `Not enough disk space: ${(free / 1e6).toFixed(0)} MB free, about ${(requiredBytes / 1e6).toFixed(0)} MB needed`,
      {
        details: { free, required: requiredBytes, outputPath },
      },
    );
  }
}
