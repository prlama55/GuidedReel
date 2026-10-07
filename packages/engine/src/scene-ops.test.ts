import { describe, expect, it } from 'vitest';
import { createProject, createScene, finalizeDraft, touchProject } from './project-factory';
import {
  addAsset,
  addScene,
  changeSceneType,
  duplicateScene,
  moveScene,
  removeAsset,
  removeScene,
  setSceneDuration,
  updateSceneProps,
  addOverlay,
  updateOverlay,
  removeOverlay,
  duplicateOverlay,
  reorderOverlay,
  splitScene,
} from './scene-ops';
import { createAsset, assetUsageCounts, missingAssetIds } from './assets';
import { validateProject } from '@guidedreel/schema';
import { analyzeProject } from './problems';

const base = () =>
  createProject({
    name: 'p',
    templateId: 'blank',
    scenes: [createScene('intro', 30, { id: 'a' }), createScene('text', 30, { id: 'b' })],
  });

describe('project factory', () => {
  it('creates a valid project with defaults', () => {
    const p = base();
    expect(validateProject(p).success).toBe(true);
    expect(p.format).toEqual({ width: 1080, height: 1920, fps: 30 });
    expect(p.scenes[0]?.durationInFrames).toBe(90);
  });

  it('touchProject bumps the revision', () => {
    const p = base();
    expect(touchProject(p).revision).toBe(1);
  });

  it('finalizeDraft builds a valid project from a draft', () => {
    const p = finalizeDraft({
      name: 'Draft',
      scenes: [
        { type: 'hook', props: { text: 'Hi' }, durationSeconds: 3 },
        { type: 'cta', props: { headline: 'Go' } },
      ],
    });
    expect(validateProject(p).success).toBe(true);
    expect(p.scenes).toHaveLength(2);
    expect(p.scenes[0]?.durationInFrames).toBe(90);
    expect(p.metadata.source).toBe('import');
  });

  it('finalizeDraft rejects unknown scene types', () => {
    expect(() => finalizeDraft({ scenes: [{ type: 'wat', props: {} }] })).toThrowError(
      /unknown type/,
    );
  });
});

describe('scene ops', () => {
  it('adds a scene with the default transition', () => {
    const { project, scene } = addScene(base(), 'cta');
    expect(project.scenes).toHaveLength(3);
    expect(scene.transitionIn).toEqual({ type: 'fade', durationInFrames: 12 });
  });

  it('inserts at an index', () => {
    const { project } = addScene(base(), 'cta', 1);
    expect(project.scenes[1]?.type).toBe('cta');
  });

  it('removes, moves and duplicates', () => {
    let p = base();
    p = moveScene(p, 'b', 0);
    expect(p.scenes.map((s) => s.id)).toEqual(['b', 'a']);
    const dup = duplicateScene(p, 'a');
    expect(dup.project.scenes).toHaveLength(3);
    expect(dup.project.scenes[2]?.type).toBe('intro');
    p = removeScene(dup.project, 'a');
    expect(p.scenes.map((s) => s.type)).toEqual(['text', 'intro']);
  });

  it('updates props with validation', () => {
    const p = updateSceneProps(base(), 'a', { title: 'New' });
    expect(p.scenes[0]?.props.title).toBe('New');
    expect(() => updateSceneProps(base(), 'a', { title: 'x'.repeat(500) })).toThrow();
  });

  it('clamps duration to the scene minimum and shortens transitions', () => {
    let p = base();
    p = {
      ...p,
      scenes: p.scenes.map((s) =>
        s.id === 'b' ? { ...s, transitionIn: { type: 'fade' as const, durationInFrames: 40 } } : s,
      ),
    };
    p = setSceneDuration(p, 'b', 35);
    expect(p.scenes[1]?.durationInFrames).toBe(35);
    expect(p.scenes[1]?.transitionIn?.durationInFrames).toBe(34);
    p = setSceneDuration(p, 'a', 1);
    expect(p.scenes[0]?.durationInFrames).toBe(30);
  });

  it('changes type keeping shared props', () => {
    let p = updateSceneProps(base(), 'b', { text: 'keep me', backgroundColor: '#ff0000' });
    p = changeSceneType(p, 'b', 'hook');
    expect(p.scenes[1]?.type).toBe('hook');
    expect(p.scenes[1]?.props.text).toBe('keep me');
    expect(p.scenes[1]?.props.backgroundColor).toBe('#ff0000');
    expect(validateProject(p).success).toBe(true);
  });

  it('removes assets and clears references', () => {
    let p = base();
    const img = createAsset({
      id: 'img',
      type: 'image',
      name: 'a.png',
      source: { kind: 'store', key: 'k' },
    });
    p = addAsset(p, img);
    p = updateSceneProps(p, 'a', { backgroundAssetId: 'img' });
    expect(assetUsageCounts(p).img).toBe(1);
    p = removeAsset(p, 'img');
    expect(p.assets).toHaveLength(0);
    expect(p.scenes[0]?.props.backgroundAssetId).toBeUndefined();
    expect(missingAssetIds(p)).toEqual([]);
  });
});

describe('analyzeProject', () => {
  it('reports empty media and fast text', () => {
    let p = base();
    p = addScene(p, 'image').project;
    p = updateSceneProps(p, 'b', { text: Array.from({ length: 60 }, () => 'word').join(' ') });
    const problems = analyzeProject(p);
    expect(problems.some((x) => x.code === 'empty-media')).toBe(true);
    expect(problems.some((x) => x.code === 'long-text' && x.sceneId === 'b')).toBe(true);
  });

  it('reports no scenes', () => {
    expect(analyzeProject(createProject({ name: 'e', templateId: 'blank' }))[0]?.code).toBe(
      'no-scenes',
    );
  });
});

describe('overlays', () => {
  it('adds, updates, reorders, duplicates and removes overlays', () => {
    let p = base();
    const a = addOverlay(p, 'a', { kind: 'text', text: 'Hello' });
    p = a.project;
    expect(a.overlay?.kind).toBe('text');
    expect(p.scenes[0]?.overlays).toHaveLength(1);
    const id = a.overlay!.id;
    p = updateOverlay(p, 'a', id, { x: 0.2, y: 0.8 });
    expect(p.scenes[0]?.overlays[0]).toMatchObject({ x: 0.2, y: 0.8 });
    expect(() => updateOverlay(p, 'a', id, { x: 9 })).toThrow();
    const d = duplicateOverlay(p, 'a', id);
    p = d.project;
    expect(p.scenes[0]?.overlays).toHaveLength(2);
    p = reorderOverlay(p, 'a', id, 1);
    expect(p.scenes[0]?.overlays[1]?.id).toBe(id);
    p = removeOverlay(p, 'a', id);
    expect(p.scenes[0]?.overlays).toHaveLength(1);
    expect(validateProject(p).success).toBe(true);
  });

  it('removing an asset removes media overlays that use it', () => {
    let p = addAsset(
      base(),
      createAsset({ id: 'img', type: 'image', name: 'a.png', source: { kind: 'store', key: 'k' } }),
    );
    p = addOverlay(p, 'a', { kind: 'media', assetId: 'img' }).project;
    expect(assetUsageCounts(p).img).toBe(1);
    expect(validateProject(p).success).toBe(true);
    p = removeAsset(p, 'img');
    expect(p.scenes[0]?.overlays).toHaveLength(0);
  });

  it('rejects overlays that reference missing assets', () => {
    const p = addOverlay(base(), 'a', { kind: 'media', assetId: 'nope' }).project;
    expect(validateProject(p).success).toBe(false);
  });
});

describe('splitScene', () => {
  it('splits a scene into two with the same content and a hard cut', () => {
    let p = base();
    p = updateSceneProps(p, 'b', { text: 'Shared text' });
    p = addOverlay(p, 'b', { kind: 'text', text: 'Badge' }).project;
    const before = p.scenes[1]!.durationInFrames;
    const r = splitScene(p, 'b', 50);
    expect(r.secondId).toBeDefined();
    expect(r.project.scenes).toHaveLength(3);
    const [, a, b] = r.project.scenes;
    expect(a?.durationInFrames).toBe(50);
    expect(b?.durationInFrames).toBe(before - 50);
    expect(b?.props.text).toBe('Shared text');
    expect(b?.transitionIn).toBeUndefined();
    expect(b?.overlays[0]?.id).not.toBe(a?.overlays[0]?.id);
    expect(validateProject(r.project).success).toBe(true);
  });

  it('refuses splits that would create a scene shorter than the minimum', () => {
    const p = base();
    expect(splitScene(p, 'a', 5).secondId).toBeUndefined();
    expect(splitScene(p, 'a', 5).project).toBe(p);
  });
});
