import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { temporal } from 'zundo';
import type {
  Asset,
  Overlay,
  OverlayDraft,
  SceneType,
  TransitionConfig,
  VideoProject,
  VideoScene,
} from '@guidedreel/schema';
import {
  addAsset as opAddAsset,
  addOverlay as opAddOverlay,
  addScene as opAddScene,
  duplicateOverlay as opDuplicateOverlay,
  removeOverlay as opRemoveOverlay,
  reorderOverlay as opReorderOverlay,
  splitScene as opSplitScene,
  updateOverlay as opUpdateOverlay,
  analyzeProject,
  changeSceneType as opChangeType,
  duplicateScene as opDuplicate,
  moveScene as opMove,
  removeAsset as opRemoveAsset,
  removeScene as opRemove,
  renameProject as opRename,
  setSceneDuration as opSetDuration,
  setSceneTransition as opSetTransition,
  setSceneVoiceover as opSetVoiceover,
  updateScene as opUpdateScene,
  updateSceneProps as opUpdateProps,
  type Problem,
} from '@guidedreel/engine';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';
export type Selection =
  | { kind: 'none' }
  | { kind: 'scene'; sceneId: string }
  | { kind: 'transition'; sceneId: string }
  | { kind: 'overlay'; sceneId: string; overlayId: string }
  | { kind: 'project' };
export type LeftPanel = 'scenes' | 'script' | 'assets' | 'templates' | 'brand';

export type EditorState = {
  project: VideoProject | null;
  selection: Selection;
  leftPanel: LeftPanel;
  currentFrame: number;
  isPlaying: boolean;
  saveState: SaveState;
  problems: Problem[];
  showSafeZones: boolean;
  showProblems: boolean;
  /** Preview crop/reposition overlay for the selected scene's media. */
  cropMode: boolean;
  /** Centre lines and thirds grid over the preview; overlays snap to them. */
  showGuides: boolean;
  /** Preview playback speed. */
  playbackRate: number;
  /** Scene for which the Record voiceover dialog is open. */
  recordSceneId: string | null;
  /** Whether the Generate music dialog is open (reachable from the toolbar and the Project inspector). */
  musicOpen: boolean;
};

export type EditorActions = {
  loadProject: (project: VideoProject) => void;
  closeProject: () => void;
  /** Replaces the project (used by autosave after touching revision). Not undoable. */
  commitSaved: (project: VideoProject) => void;
  setProject: (project: VideoProject) => void;
  updateProject: (patch: (p: VideoProject) => VideoProject) => void;
  rename: (name: string) => void;

  select: (selection: Selection) => void;
  setLeftPanel: (panel: LeftPanel) => void;
  setFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  setSaveState: (s: SaveState) => void;
  toggleSafeZones: () => void;
  toggleProblems: () => void;
  setCropMode: (on: boolean) => void;
  toggleGuides: () => void;
  openRecorder: (sceneId: string | null) => void;
  openMusic: (open: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  /** Splits a scene at an absolute timeline frame; selects the second part. */
  splitSceneAt: (sceneId: string, atFrameWithinScene: number) => void;
  /** Selects a scene and opens Crop mode for it (used right after media is assigned). */
  cropScene: (sceneId: string) => void;

  addScene: (type: SceneType, index?: number) => VideoScene | undefined;
  removeScene: (sceneId: string) => void;
  moveScene: (sceneId: string, toIndex: number) => void;
  duplicateScene: (sceneId: string) => void;
  updateScene: (sceneId: string, patch: Partial<Omit<VideoScene, 'id' | 'type' | 'props'>>) => void;
  updateSceneProps: (sceneId: string, patch: Record<string, unknown>) => void;
  setSceneDuration: (sceneId: string, frames: number) => void;
  setSceneTransition: (sceneId: string, transition: TransitionConfig | undefined) => void;
  setSceneVoiceover: (sceneId: string, assetId: string | undefined) => void;
  changeSceneType: (sceneId: string, type: SceneType) => void;

  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;

  addOverlay: (sceneId: string, draft: OverlayDraft) => Overlay | undefined;
  updateOverlay: (sceneId: string, overlayId: string, patch: Partial<Overlay>) => void;
  removeOverlay: (sceneId: string, overlayId: string) => void;
  duplicateOverlay: (sceneId: string, overlayId: string) => void;
  reorderOverlay: (sceneId: string, overlayId: string, direction: 1 | -1) => void;
};

export type EditorStore = EditorState & EditorActions;

const initial: EditorState = {
  project: null,
  selection: { kind: 'none' },
  leftPanel: 'scenes',
  currentFrame: 0,
  isPlaying: false,
  saveState: 'saved',
  problems: [],
  showSafeZones: true,
  showProblems: false,
  cropMode: false,
  showGuides: false,
  playbackRate: 1,
  recordSceneId: null,
  musicOpen: false,
};

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => {
      /** Applies an undoable project change. */
      const apply = (fn: (p: VideoProject) => VideoProject) => {
        const { project } = get();
        if (!project) return;
        let next: VideoProject;
        try {
          next = fn(project);
        } catch (err) {
          console.warn('[editor] rejected change', err);
          return;
        }
        if (next === project) return;
        set({ project: next, saveState: 'unsaved', problems: analyzeProject(next) });
      };

      return {
        ...initial,
        loadProject: (project) => {
          set({
            ...initial,
            project,
            problems: analyzeProject(project),
            selection: project.scenes[0]
              ? { kind: 'scene', sceneId: project.scenes[0].id }
              : { kind: 'project' },
          });
          useEditorStore.temporal.getState().clear();
        },
        closeProject: () => set({ ...initial }),
        commitSaved: (project) => {
          useEditorStore.temporal.getState().pause();
          set({ project, saveState: 'saved' });
          useEditorStore.temporal.getState().resume();
        },
        setProject: (project) => apply(() => project),
        updateProject: (patch) => apply(patch),
        rename: (name) => apply((p) => opRename(p, name)),

        select: (selection) => set({ selection }),
        setLeftPanel: (leftPanel) => set({ leftPanel }),
        setFrame: (currentFrame) => set({ currentFrame }),
        setPlaying: (isPlaying) => set({ isPlaying }),
        setSaveState: (saveState) => set({ saveState }),
        toggleSafeZones: () => set((s) => ({ showSafeZones: !s.showSafeZones })),
        toggleProblems: () => set((s) => ({ showProblems: !s.showProblems })),
        setCropMode: (cropMode) => set({ cropMode }),
        toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
        openRecorder: (recordSceneId) => set({ recordSceneId }),
        openMusic: (musicOpen) => set({ musicOpen }),
        setPlaybackRate: (playbackRate) => set({ playbackRate }),
        splitSceneAt: (sceneId, at) => {
          let secondId: string | undefined;
          apply((p) => {
            const r = opSplitScene(p, sceneId, at);
            secondId = r.secondId;
            return r.project;
          });
          if (secondId) set({ selection: { kind: 'scene', sceneId: secondId } });
        },
        cropScene: (sceneId) => set({ selection: { kind: 'scene', sceneId }, cropMode: true }),

        addScene: (type, index) => {
          let created: VideoScene | undefined;
          apply((p) => {
            const r = opAddScene(p, type, index);
            created = r.scene;
            return r.project;
          });
          if (created) set({ selection: { kind: 'scene', sceneId: created.id } });
          return created;
        },
        removeScene: (sceneId) => {
          const { project, selection } = get();
          const idx = project?.scenes.findIndex((s) => s.id === sceneId) ?? -1;
          apply((p) => opRemove(p, sceneId));
          const after = get().project;
          if (
            selection.kind !== 'none' &&
            'sceneId' in selection &&
            selection.sceneId === sceneId &&
            after
          ) {
            const next = after.scenes[Math.min(idx, after.scenes.length - 1)];
            set({ selection: next ? { kind: 'scene', sceneId: next.id } : { kind: 'project' } });
          }
        },
        moveScene: (sceneId, toIndex) => apply((p) => opMove(p, sceneId, toIndex)),
        duplicateScene: (sceneId) => {
          let created: VideoScene | undefined;
          apply((p) => {
            const r = opDuplicate(p, sceneId);
            created = r.scene;
            return r.project;
          });
          if (created) set({ selection: { kind: 'scene', sceneId: created.id } });
        },
        updateScene: (sceneId, patch) => apply((p) => opUpdateScene(p, sceneId, patch)),
        updateSceneProps: (sceneId, patch) => apply((p) => opUpdateProps(p, sceneId, patch)),
        setSceneDuration: (sceneId, frames) => apply((p) => opSetDuration(p, sceneId, frames)),
        setSceneTransition: (sceneId, t) => apply((p) => opSetTransition(p, sceneId, t)),
        setSceneVoiceover: (sceneId, assetId) => apply((p) => opSetVoiceover(p, sceneId, assetId)),
        changeSceneType: (sceneId, type) => apply((p) => opChangeType(p, sceneId, type)),

        addAsset: (asset) => apply((p) => opAddAsset(p, asset)),
        removeAsset: (assetId) => apply((p) => opRemoveAsset(p, assetId)),

        addOverlay: (sceneId, draft) => {
          let created: Overlay | undefined;
          apply((p) => {
            const r = opAddOverlay(p, sceneId, draft);
            created = r.overlay;
            return r.project;
          });
          if (created)
            set({
              selection: { kind: 'overlay', sceneId, overlayId: created.id },
              cropMode: false,
            });
          return created;
        },
        updateOverlay: (sceneId, overlayId, patch) =>
          apply((p) => opUpdateOverlay(p, sceneId, overlayId, patch)),
        removeOverlay: (sceneId, overlayId) => {
          apply((p) => opRemoveOverlay(p, sceneId, overlayId));
          const sel = get().selection;
          if (sel.kind === 'overlay' && sel.overlayId === overlayId)
            set({ selection: { kind: 'scene', sceneId } });
        },
        duplicateOverlay: (sceneId, overlayId) => {
          let created: Overlay | undefined;
          apply((p) => {
            const r = opDuplicateOverlay(p, sceneId, overlayId);
            created = r.overlay;
            return r.project;
          });
          if (created) set({ selection: { kind: 'overlay', sceneId, overlayId: created.id } });
        },
        reorderOverlay: (sceneId, overlayId, direction) =>
          apply((p) => opReorderOverlay(p, sceneId, overlayId, direction)),
      };
    },
    {
      // Only the document participates in undo/redo.
      partialize: (state) => ({ project: state.project }),
      equality: (a, b) => a.project === b.project,
      limit: 200,
    },
  ),
);

export const useSelectedScene = (): VideoScene | undefined =>
  useEditorStore((s) => {
    if (!s.project || s.selection.kind === 'none' || s.selection.kind === 'project')
      return undefined;
    const id = s.selection.sceneId;
    return s.project.scenes.find((sc) => sc.id === id);
  });

export function undo(): void {
  useEditorStore.temporal.getState().undo();
  markUnsaved();
}
export function redo(): void {
  useEditorStore.temporal.getState().redo();
  markUnsaved();
}
function markUnsaved() {
  const s = useEditorStore.getState();
  if (s.project) s.setSaveState('unsaved');
  useEditorStore.setState({ problems: s.project ? analyzeProject(s.project) : [] });
}

/**
 * Groups many rapid edits (a drag, a scroll-zoom burst) into one undo entry.
 * Call begin() before the first change and end() after the last one.
 */
export function beginGroupedEdit(): () => void {
  const temporal = useEditorStore.temporal.getState();
  const before = useEditorStore.getState().project;
  temporal.pause();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    const t = useEditorStore.temporal.getState();
    t.resume();
    const after = useEditorStore.getState().project;
    if (before && after && before !== after) {
      useEditorStore.temporal.setState({
        pastStates: [...t.pastStates, { project: before }],
        futureStates: [],
      });
    }
  };
}

export const useSelectedOverlay = (): { scene: VideoScene; overlay: Overlay } | undefined => {
  // useShallow keeps the returned pair referentially stable between renders.
  const [scene, overlay] = useEditorStore(
    useShallow((s): [VideoScene | undefined, Overlay | undefined] => {
      if (!s.project || s.selection.kind !== 'overlay') return [undefined, undefined];
      const { sceneId, overlayId } = s.selection;
      const sc = s.project.scenes.find((x) => x.id === sceneId);
      return [sc, sc?.overlays.find((o) => o.id === overlayId)];
    }),
  );
  return scene && overlay ? { scene, overlay } : undefined;
};
