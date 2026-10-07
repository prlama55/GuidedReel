import { describe, expect, it } from 'vitest';
import { SCENE_TYPES } from '@guidedreel/schema';
import { SCENE_COMPONENTS } from './scenes/registry';
import { resolveTransition } from './transitions/index';
import { computeCompositionMetadata } from './metadata';
import { createSampleProject } from './sample';
import { createTheme, designScale, withAlpha } from './theme';
import { fadeIn, fadeOut, isHighlighted, splitWords, typewriter } from './animations/index';
import { resolveFit } from './components/fit';
import { mediaSlotSize } from './components/slots';
import {
  ENTER_ANIMATIONS,
  EXIT_ANIMATIONS,
  LOOP_ANIMATIONS,
  IMAGE_MOTIONS,
} from '@guidedreel/schema';
import {
  animateElement,
  enterPreset,
  exitPreset,
  imageMotion,
  loopPreset,
} from './animations/presets';

describe('scene registry', () => {
  it('has a component for every scene type', () => {
    for (const type of SCENE_TYPES) expect(SCENE_COMPONENTS[type], type).toBeTypeOf('function');
  });
});

describe('transitions', () => {
  it('maps every transition type, and none/zero to null', () => {
    expect(resolveTransition({ type: 'none', durationInFrames: 10 }, 10)).toBeNull();
    expect(resolveTransition({ type: 'fade', durationInFrames: 10 }, 0)).toBeNull();
    for (const type of [
      'fade',
      'slide-left',
      'slide-right',
      'slide-up',
      'slide-down',
      'zoom',
      'wipe',
    ] as const) {
      const t = resolveTransition({ type, durationInFrames: 12 }, 9);
      expect(t?.durationInFrames).toBe(9);
      expect(t?.presentation.component).toBeDefined();
    }
  });
});

describe('metadata', () => {
  it('derives size and duration from the project', () => {
    const p = createSampleProject();
    const m = computeCompositionMetadata(p);
    expect(m.width).toBe(1080);
    expect(m.height).toBe(1920);
    expect(m.fps).toBe(30);
    const sum = p.scenes.reduce((a, s) => a + s.durationInFrames, 0);
    const overlaps = p.scenes
      .slice(1)
      .reduce((a, s) => a + (s.transitionIn?.durationInFrames ?? 0), 0);
    expect(m.durationInFrames).toBe(sum - overlaps);
  });
});

describe('theme', () => {
  it('scales from the short side and falls back to defaults', () => {
    expect(designScale({ width: 1920, height: 1080 })).toBe(1);
    expect(designScale({ width: 540, height: 960 })).toBe(0.5);
    const theme = createTheme(createSampleProject());
    expect(theme.colors.primary).toBe('#6366F1');
    expect(theme.fonts.body).toContain('Inter');
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });
});

describe('animation helpers', () => {
  it('fades clamp to 0..1', () => {
    expect(fadeIn(-5)).toBe(0);
    expect(fadeIn(100)).toBe(1);
    expect(fadeOut(100, 100)).toBe(0);
    expect(fadeOut(0, 100)).toBe(1);
  });
  it('typewriter and word helpers work with non-Latin text', () => {
    expect(typewriter('नमस्ते संसार', 5, { charsPerFrame: 1 })).toBe('नमस्त');
    expect(splitWords('धेरै समाचार, समय छैन?')).toEqual(['धेरै', 'समाचार,', 'समय', 'छैन?']);
    expect(isHighlighted('समाचार,', ['समाचार'])).toBe(true);
    expect(isHighlighted('News!', ['news'])).toBe(true);
  });
});

describe('resolveFit', () => {
  const portraitBox = { width: 1080, height: 1920 };
  it('covers when the aspect ratios are close', () => {
    expect(resolveFit('auto', { width: 1080, height: 1920 }, portraitBox)).toBe('cover');
    expect(resolveFit('auto', { width: 1000, height: 1600 }, portraitBox)).toBe('cover');
  });
  it('contains when the media would be cropped heavily', () => {
    expect(resolveFit('auto', { width: 1920, height: 1080 }, portraitBox)).toBe('contain');
    expect(resolveFit('auto', { width: 1000, height: 1000 }, portraitBox)).toBe('contain');
  });
  it('falls back to contain without dimensions and honours explicit modes', () => {
    expect(resolveFit('auto', undefined, portraitBox)).toBe('contain');
    expect(resolveFit('auto', { width: 0, height: 0 }, portraitBox)).toBe('contain');
    expect(resolveFit('cover', { width: 1920, height: 1080 }, portraitBox)).toBe('cover');
    expect(resolveFit('contain', { width: 1080, height: 1920 }, portraitBox)).toBe('contain');
  });
});

describe('mediaSlotSize', () => {
  it('matches the frame for image/video and null for scenes without media', () => {
    expect(mediaSlotSize('image', {}, { width: 1080, height: 1920 })).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(mediaSlotSize('text', {}, { width: 1080, height: 1920 })).toBeNull();
    expect(
      mediaSlotSize('feature', { layout: 'text-only' }, { width: 1080, height: 1920 }),
    ).toBeNull();
  });
  it('turns stacked feature layouts side-by-side in landscape', () => {
    const portrait = mediaSlotSize(
      'feature',
      { layout: 'media-top' },
      { width: 1080, height: 1920 },
    )!;
    const landscape = mediaSlotSize(
      'feature',
      { layout: 'media-top' },
      { width: 1920, height: 1080 },
    )!;
    expect(portrait.width).toBeCloseTo(1080 * 0.84);
    expect(landscape.width).toBeCloseTo(1920 * 0.42);
  });
});

describe('animation presets', () => {
  it('every enter preset starts hidden/offset and settles to identity', () => {
    for (const a of ENTER_ANIMATIONS) {
      const end = enterPreset(a, 200, 30, 15);
      if (a === 'none' || a === 'typewriter') {
        expect(end).toEqual({});
        continue;
      }
      if (end.opacity !== undefined) expect(end.opacity).toBeCloseTo(1, 1);
      const start = enterPreset(a, 0, 30, 15);
      expect(JSON.stringify(start)).not.toEqual(JSON.stringify(end));
    }
  });
  it('every exit preset is inert before the exit window and resolves at the end', () => {
    for (const a of EXIT_ANIMATIONS) {
      expect(exitPreset(a, 10, 100, 15)).toEqual({});
      const end = exitPreset(a, 100, 100, 15);
      if (a !== 'none') expect(end).not.toEqual({});
      if (end.opacity !== undefined) expect(end.opacity).toBeCloseTo(0, 1);
    }
  });
  it('loop presets are periodic styles and off before settling', () => {
    for (const a of LOOP_ANIMATIONS) {
      expect(loopPreset(a, -1, 30)).toEqual({});
      if (a !== 'none') expect(loopPreset(a, 7, 30)).not.toEqual({});
    }
  });
  it('image motions return a transform except none', () => {
    for (const m of IMAGE_MOTIONS) {
      const st = imageMotion(m, 30, 120);
      if (m === 'none') expect(st).toEqual({});
      else expect(st.transform).toBeTruthy();
    }
  });
  it('animateElement composes enter, exit and loop into one style', () => {
    const style = animateElement(
      {
        animation: 'slide-up',
        exitAnimation: 'fade',
        loopAnimation: 'pulse',
        enterDurationFrames: 10,
        exitDurationFrames: 10,
      },
      50,
      30,
      100,
    );
    expect(style.transform).toContain('scale(');
    expect(style.opacity ?? 1).toBeCloseTo(1, 1);
    const end = animateElement(
      {
        animation: 'fade',
        exitAnimation: 'slide-left',
        enterDurationFrames: 10,
        exitDurationFrames: 10,
      },
      100,
      30,
      100,
    );
    expect(end.opacity).toBeCloseTo(0, 1);
  });
});
