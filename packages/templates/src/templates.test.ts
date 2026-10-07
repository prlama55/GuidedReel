import { describe, expect, it } from 'vitest';
import { FORMAT_PRESETS, validateProject, type AspectRatio } from '@guidedreel/schema';
import { calculateTimeline } from '@guidedreel/engine';
import { createTemplateRegistry } from './index';

const registry = createTemplateRegistry();

describe('built-in templates', () => {
  it('registers the expected templates', () => {
    expect(
      registry
        .list()
        .map((m) => m.id)
        .sort(),
    ).toEqual(['blank', 'modern-promo', 'product-ad', 'social-reel']);
  });

  it('every template produces a valid project for every supported format from its sample input', () => {
    for (const meta of registry.list()) {
      const template = registry.require(meta.id);
      for (const ratio of meta.supportedFormats as AspectRatio[]) {
        const project = registry.instantiate(meta.id, template.sampleInput(), {
          name: `${meta.name} ${ratio}`,
          format: FORMAT_PRESETS[ratio].format,
          aspectRatio: ratio,
        });
        const result = validateProject(project);
        expect(result.success, `${meta.id} ${ratio}: ${JSON.stringify(result.issues)}`).toBe(true);
        expect(project.templateId).toBe(meta.id);
        expect(project.metadata.source).toBe('template');
        if (meta.id !== 'blank') {
          const tl = calculateTimeline(project);
          expect(tl.totalFrames).toBeGreaterThan(project.format.fps * 5);
          expect(project.scenes[0]?.transitionIn).toBeUndefined();
        }
      }
    }
  });

  it('rejects unsupported formats and invalid input', () => {
    expect(() =>
      registry.instantiate('social-reel', registry.require('social-reel').sampleInput(), {
        name: 'x',
        format: FORMAT_PRESETS['16:9'].format,
        aspectRatio: '16:9',
      }),
    ).toThrowError(/does not support/);
    expect(() =>
      registry.instantiate(
        'modern-promo',
        {},
        { name: 'x', format: FORMAT_PRESETS['9:16'].format, aspectRatio: '9:16' },
      ),
    ).toThrowError(/invalid/);
    expect(() => registry.require('nope')).toThrowError(/not registered/);
  });
});
