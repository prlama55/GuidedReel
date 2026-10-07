import { describe, expect, it } from 'vitest';
import { createProject, createScene } from '../project-factory';
import { alignScenesToBeat, framesPerBeat } from './beat';
import { detectBpm } from './bpm';
import { planMusic, suggestMood } from './plan';
import { calculateTimeline } from '../timeline';

const project = () =>
  createProject({
    name: 'm',
    templateId: 'modern-promo',
    scenes: [
      createScene('hook', 30, { id: 'h', durationInFrames: 100 }),
      createScene('feature', 30, {
        id: 'f1',
        durationInFrames: 130,
        transitionIn: { type: 'fade', durationInFrames: 10 },
      }),
      createScene('feature', 30, {
        id: 'f2',
        durationInFrames: 130,
        transitionIn: { type: 'fade', durationInFrames: 10 },
      }),
      createScene('cta', 30, { id: 'c', durationInFrames: 95 }),
    ],
  });

describe('planMusic', () => {
  it('derives mood, tempo, sections and an intensity curve from the scenes', () => {
    const plan = planMusic(project());
    expect(plan.mood).toBe('upbeat');
    expect(plan.bpm).toBeGreaterThanOrEqual(60);
    expect(plan.sections.map((s) => s.sceneId)).toEqual(['h', 'f1', 'f2', 'c']);
    expect(plan.sections[1]!.intensity).toBeLessThan(plan.sections[2]!.intensity);
    expect(plan.sections[3]!.intensity).toBe(1);
    expect(plan.durationSeconds).toBeCloseTo(calculateTimeline(project()).totalFrames / 30, 5);
    expect(plan.sections[1]!.startSeconds).toBeCloseTo(90 / 30, 5);
  });
  it('is deterministic for a project and honours overrides', () => {
    const same = project();
    expect(planMusic(same)).toEqual(planMusic(same));
    const p = planMusic(project(), { mood: 'dramatic', bpm: 999, seed: 3 });
    expect(p.mood).toBe('dramatic');
    expect(p.bpm).toBe(180);
    expect(p.scale).toContain(3);
    expect(suggestMood(createProject({ name: 'x', templateId: 'social-reel' }))).toBe('upbeat');
  });
});

describe('energy', () => {
  it('soft keeps the whole curve quiet, hard keeps it driving, and tempo follows', () => {
    const soft = planMusic(project(), { energy: 'soft' });
    const hard = planMusic(project(), { energy: 'hard' });
    expect(Math.max(...soft.sections.map((s) => s.intensity))).toBeLessThanOrEqual(0.4);
    expect(Math.min(...hard.sections.map((s) => s.intensity))).toBeGreaterThanOrEqual(0.65);
    expect(hard.bpm).toBeGreaterThan(soft.bpm);
    expect(planMusic(project()).energy).toBe('medium');
  });
});

describe('alignScenesToBeat', () => {
  it('snaps scene advances to whole beats and keeps minimums', () => {
    const p = alignScenesToBeat(project(), 120);
    const beat = framesPerBeat(120, 30); // 15 frames
    expect(p.scenes[0]!.durationInFrames % beat).toBe(0);
    // scene with a 10-frame incoming overlap: (duration - 10) is a beat multiple
    expect((p.scenes[1]!.durationInFrames - 10) % beat).toBe(0);
    expect(
      p.scenes.every((s, i) => s.durationInFrames >= project().scenes[i]!.durationInFrames * 0.8),
    ).toBe(true);
  });
  it('can snap to bars and never shorten in up mode', () => {
    const base = project();
    const p = alignScenesToBeat(base, 120, { unit: 'bar', mode: 'up' });
    p.scenes.forEach((s, i) =>
      expect(s.durationInFrames).toBeGreaterThanOrEqual(base.scenes[i]!.durationInFrames),
    );
    expect(p.scenes[0]!.durationInFrames % 60).toBe(0);
  });
});

describe('detectBpm', () => {
  it('finds the tempo of a synthetic click track', () => {
    const sr = 8000;
    const bpm = 120;
    const seconds = 12;
    const samples = new Float32Array(sr * seconds);
    const period = Math.round((60 / bpm) * sr);
    for (let i = 0; i < samples.length; i++) {
      const phase = i % period;
      if (phase < 200) samples[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * Math.exp(-phase / 40);
      samples[i]! += ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.01; // light deterministic noise
    }
    const result = detectBpm(samples, sr);
    expect(Math.abs(result.bpm - bpm)).toBeLessThanOrEqual(2);
    expect(result.confidence).toBeGreaterThan(0.2);
  });
  it('returns zero for very short input', () => {
    expect(detectBpm(new Float32Array(100), 8000).bpm).toBe(0);
  });
});
