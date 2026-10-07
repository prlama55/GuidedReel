import { describe, expect, it } from 'vitest';
import { mkdtemp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSampleProject } from '@guidedreel/compositions';
import type { RenderProgress } from '@guidedreel/schema';
import { LocalRemotionRenderer } from './local-renderer';

/**
 * End-to-end: Project → bundle → composition → MP4. Downloads the headless
 * browser on first run; takes a minute or two. Run with `pnpm test:integration`.
 */
describe('LocalRemotionRenderer (integration)', () => {
  it('renders the sample project to an MP4 with progress', async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'vc-render-'));
    const renderer = new LocalRemotionRenderer({
      outputDir: outDir,
      bundleDir: path.join(os.tmpdir(), 'vc-bundle-test'),
    });
    const project = createSampleProject();
    // Keep the test fast: 2 short scenes.
    project.scenes = project.scenes.slice(0, 2).map((s) => ({ ...s, durationInFrames: 60 }));
    const seen: RenderProgress['status'][] = [];
    const result = await renderer.render(
      project,
      { codec: 'h264', quality: 'draft', scale: 0.25, muted: true, fileName: 'sample' },
      { onProgress: (p) => seen.push(p.status) },
    );
    expect(result.outputPath!.endsWith('sample.mp4')).toBe(true);
    expect((await stat(result.outputPath!)).size).toBeGreaterThan(1000);
    expect(result.totalFrames).toBe(60 + 60 - 14);
    expect(seen[0]).toBe('preparing');
    expect(seen).toContain('rendering');
    expect(seen[seen.length - 1]).toBe('completed');
  });
});
