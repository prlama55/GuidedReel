import { describe, expect, it } from 'vitest';
import { createProject, createScene } from './project-factory';
import { calculateTimeline, sceneAtFrame } from './timeline';
import { createAsset } from './assets';
import { addAsset, setSceneVoiceover } from './scene-ops';

function project() {
  const fps = 30;
  return createProject({
    name: 't',
    templateId: 'blank',
    aspectRatio: '9:16',
    scenes: [
      createScene('intro', fps, { id: 'a', durationInFrames: 90 }),
      createScene('text', fps, {
        id: 'b',
        durationInFrames: 120,
        transitionIn: { type: 'fade', durationInFrames: 15 },
      }),
      createScene('cta', fps, {
        id: 'c',
        durationInFrames: 60,
        transitionIn: { type: 'slide-left', durationInFrames: 10 },
      }),
    ],
  });
}

describe('calculateTimeline', () => {
  it('derives start frames with transition overlaps', () => {
    const tl = calculateTimeline(project());
    expect(tl.sceneOrder.map((s) => [s.startFrame, s.endFrame])).toEqual([
      [0, 90],
      [75, 195],
      [185, 245],
    ]);
    expect(tl.totalFrames).toBe(90 + 120 + 60 - 15 - 10);
  });

  it('ignores the first scene transition for positioning', () => {
    const p = project();
    p.scenes[0]!.transitionIn = { type: 'fade', durationInFrames: 20 };
    const tl = calculateTimeline(p);
    expect(tl.sceneOrder[0]?.startFrame).toBe(0);
    expect(tl.totalFrames).toBe(245);
  });

  it('skips hidden scenes', () => {
    const p = project();
    p.scenes[1]!.hidden = true;
    const tl = calculateTimeline(p);
    expect(tl.sceneOrder.map((s) => s.refId)).toEqual(['a', 'c']);
    expect(tl.totalFrames).toBe(90 + 60 - 10);
  });

  it('uses voiceover duration when durationMode is fromAudio', () => {
    let p = project();
    p = addAsset(
      p,
      createAsset({
        id: 'vo',
        type: 'voiceover',
        name: 'vo.mp3',
        source: { kind: 'url', url: 'https://x/vo.mp3' },
        duration: 6,
      }),
    );
    p = setSceneVoiceover(p, 'b', 'vo');
    const tl = calculateTimeline(p);
    // 6s * 30 + 15 padding
    expect(tl.scenes.b?.durationInFrames).toBe(195);
    expect(tl.tracks.find((t) => t.kind === 'voiceover')?.items[0]?.refId).toBe('vo');
  });

  it('adds a music item spanning the whole video', () => {
    let p = project();
    p = addAsset(
      p,
      createAsset({
        id: 'm',
        type: 'music',
        name: 'm.mp3',
        source: { kind: 'url', url: 'https://x/m.mp3' },
        duration: 60,
      }),
    );
    p = { ...p, audio: { ...p.audio, musicAssetId: 'm' } };
    const tl = calculateTimeline(p);
    const music = tl.tracks.find((t) => t.kind === 'music')!.items[0]!;
    expect(music.startFrame).toBe(0);
    expect(music.endFrame).toBe(tl.totalFrames);
  });

  it('finds the scene at a frame, preferring the incoming scene during overlap', () => {
    const tl = calculateTimeline(project());
    expect(sceneAtFrame(tl, 0)?.refId).toBe('a');
    expect(sceneAtFrame(tl, 80)?.refId).toBe('b');
    expect(sceneAtFrame(tl, 244)?.refId).toBe('c');
    expect(sceneAtFrame(tl, 9999)?.refId).toBe('c');
  });

  it('handles an empty project', () => {
    const tl = calculateTimeline(createProject({ name: 'e', templateId: 'blank' }));
    expect(tl.totalFrames).toBe(1);
    expect(tl.sceneOrder).toEqual([]);
  });
});
