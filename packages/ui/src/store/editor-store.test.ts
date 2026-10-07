import { beforeEach, describe, expect, it } from 'vitest';
import { createProject, createScene } from '@guidedreel/engine';
import { redo, undo, useEditorStore } from './editor-store';

const make = () =>
  createProject({
    name: 'T',
    templateId: 'blank',
    scenes: [createScene('hook', 30, { id: 'a' }), createScene('text', 30, { id: 'b' })],
  });

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().closeProject();
    useEditorStore.temporal.getState().clear();
  });

  it('loads a project and selects the first scene', () => {
    useEditorStore.getState().loadProject(make());
    const s = useEditorStore.getState();
    expect(s.project?.scenes).toHaveLength(2);
    expect(s.selection).toEqual({ kind: 'scene', sceneId: 'a' });
    expect(s.saveState).toBe('saved');
  });

  it('applies undoable changes and tracks save state', () => {
    const store = useEditorStore.getState();
    store.loadProject(make());
    store.updateSceneProps('a', { text: 'Hello' });
    expect(useEditorStore.getState().project?.scenes[0]?.props.text).toBe('Hello');
    expect(useEditorStore.getState().saveState).toBe('unsaved');
    undo();
    expect(useEditorStore.getState().project?.scenes[0]?.props.text).not.toBe('Hello');
    redo();
    expect(useEditorStore.getState().project?.scenes[0]?.props.text).toBe('Hello');
  });

  it('rejects invalid prop changes without crashing', () => {
    const store = useEditorStore.getState();
    store.loadProject(make());
    const before = useEditorStore.getState().project;
    store.updateSceneProps('a', { text: '' });
    expect(useEditorStore.getState().project).toBe(before);
  });

  it('moves selection when the selected scene is removed', () => {
    const store = useEditorStore.getState();
    store.loadProject(make());
    store.removeScene('a');
    expect(useEditorStore.getState().selection).toEqual({ kind: 'scene', sceneId: 'b' });
    store.removeScene('b');
    expect(useEditorStore.getState().selection).toEqual({ kind: 'project' });
  });

  it('adds scenes with the default transition and recomputes problems', () => {
    const store = useEditorStore.getState();
    store.loadProject(make());
    const scene = store.addScene('image');
    expect(scene?.transitionIn).toEqual({ type: 'fade', durationInFrames: 12 });
    expect(useEditorStore.getState().problems.some((p) => p.code === 'empty-media')).toBe(true);
  });

  it('commitSaved does not create history entries', () => {
    const store = useEditorStore.getState();
    store.loadProject(make());
    store.rename('New name');
    const past = useEditorStore.temporal.getState().pastStates.length;
    store.commitSaved({ ...useEditorStore.getState().project!, revision: 5 });
    expect(useEditorStore.temporal.getState().pastStates.length).toBe(past);
    expect(useEditorStore.getState().saveState).toBe('saved');
  });
});
