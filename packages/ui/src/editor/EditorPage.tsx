import { useCallback, useEffect, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { PlayerRef } from '@remotion/player';
import { calculateTimeline } from '@guidedreel/engine';
import { useHost } from '../host/HostContext';
import { useAutosave, saveNow } from '../hooks/useAutosave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { redo, undo, useEditorStore } from '../store/editor-store';
import { Toolbar } from './Toolbar';
import { LeftRail } from './LeftRail';
import { ScenesPanel } from './panels/ScenesPanel';
import { ScriptPanel } from './panels/ScriptPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { BrandPanel } from './panels/BrandPanel';
import { PreviewStage } from './PreviewStage';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { ProblemsPanel } from './ProblemsPanel';
import { ExportDialog } from './ExportDialog';
import { ShortcutsDialog } from './ShortcutsDialog';
import { RecordDialog } from './RecordDialog';
import { MusicDialog } from './MusicDialog';
import { Skeleton, EmptyState, Button } from '../primitives/index';

const Handle: React.FC<{ direction?: 'horizontal' | 'vertical' }> = ({
  direction = 'horizontal',
}) => (
  <Separator
    className={
      direction === 'horizontal'
        ? 'w-1 bg-border transition-colors hover:bg-primary'
        : 'h-1 bg-border transition-colors hover:bg-primary'
    }
  />
);

/** Loads a project by id from the host's repository and renders the editor. */
export const EditorPage: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { storage, navigate } = useHost();
  const loadProject = useEditorStore((s) => s.loadProject);
  const closeProject = useEditorStore((s) => s.closeProject);
  const loaded = useEditorStore((s) => s.project?.id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    storage.projects
      .get(projectId)
      .then((p) => {
        if (cancelled) return;
        if (!p) setError('This project does not exist or was deleted.');
        else loadProject(p);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
      closeProject();
    };
  }, [projectId, storage, loadProject, closeProject]);

  if (error)
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState
          title="Could not open project"
          description={error}
          action={
            <Button variant="primary" onClick={() => navigate({ name: 'projects' })}>
              Back to projects
            </Button>
          }
        />
      </div>
    );
  if (loaded !== projectId) return <EditorSkeleton />;
  return <EditorShell />;
};

const EditorSkeleton: React.FC = () => (
  <div className="flex h-full flex-col">
    <div className="h-12 border-b border-border bg-surface" />
    <div className="flex flex-1">
      <div className="w-14 border-r border-border bg-surface" />
      <div className="w-72 border-r border-border p-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-3 h-16" />
        <Skeleton className="mt-2 h-16" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-stage">
        <Skeleton className="h-[60%] w-[30%]" />
      </div>
      <div className="w-80 border-l border-border p-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-3 h-8" />
        <Skeleton className="mt-2 h-8" />
      </div>
    </div>
    <div className="h-36 border-t border-border bg-surface" />
  </div>
);

const EditorShell: React.FC = () => {
  const { storage } = useHost();
  const playerRef = useRef<PlayerRef | null>(null);
  const leftPanel = useEditorStore((s) => s.leftPanel);
  const showProblems = useEditorStore((s) => s.showProblems);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const removeScene = useEditorStore((s) => s.removeScene);
  const duplicateScene = useEditorStore((s) => s.duplicateScene);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const recordSceneId = useEditorStore((s) => s.recordSceneId);
  const musicOpen = useEditorStore((s) => s.musicOpen);
  const openMusic = useEditorStore((s) => s.openMusic);
  const openRecorder = useEditorStore((s) => s.openRecorder);
  useAutosave();

  const handlers = {
    togglePlay: useCallback(() => playerRef.current?.toggle(), []),
    nudge: useCallback((dx: number, dy: number) => {
      const st = useEditorStore.getState();
      if (st.selection.kind !== 'overlay') return false;
      const { sceneId, overlayId } = st.selection;
      const o = st.project?.scenes
        .find((s) => s.id === sceneId)
        ?.overlays.find((v) => v.id === overlayId);
      if (!o || o.locked) return true;
      st.updateOverlay(sceneId, overlayId, {
        x: Math.min(1.5, Math.max(-0.5, o.x + dx)),
        y: Math.min(1.5, Math.max(-0.5, o.y + dy)),
      });
      return true;
    }, []),
    stepFrame: useCallback(
      (d: number) => {
        playerRef.current?.pause();
        playerRef.current?.seekTo(Math.max(0, currentFrame + d));
      },
      [currentFrame],
    ),
    deleteSelection: useCallback(() => {
      if (selection.kind === 'scene') removeScene(selection.sceneId);
      if (selection.kind === 'overlay')
        useEditorStore.getState().removeOverlay(selection.sceneId, selection.overlayId);
    }, [selection, removeScene]),
    duplicate: useCallback(() => {
      if (selection.kind === 'scene') duplicateScene(selection.sceneId);
      if (selection.kind === 'overlay')
        useEditorStore.getState().duplicateOverlay(selection.sceneId, selection.overlayId);
    }, [selection, duplicateScene]),
    moveScene: useCallback((direction: -1 | 1) => {
      const st = useEditorStore.getState();
      if (st.selection.kind !== 'scene' || !st.project) return;
      const sceneId = st.selection.sceneId;
      const idx = st.project.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;
      st.moveScene(sceneId, Math.max(0, Math.min(st.project.scenes.length - 1, idx + direction)));
    }, []),
    split: useCallback(() => {
      const st = useEditorStore.getState();
      if (!st.project) return;
      const tl = calculateTimeline(st.project);
      const f = st.currentFrame;
      const item = tl.sceneOrder.find((i) => f > i.startFrame && f < i.endFrame - 1);
      if (item) st.splitSceneAt(item.refId, f - item.startFrame);
    }, []),
    shuttle: useCallback((key: 'J' | 'K' | 'L') => {
      const st = useEditorStore.getState();
      const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
      const p = playerRef.current;
      if (!p) return;
      if (key === 'K') {
        p.pause();
        return;
      }
      const i = rates.indexOf(st.playbackRate);
      if (key === 'L') {
        if (p.isPlaying()) st.setPlaybackRate(rates[Math.min(rates.length - 1, i + 1)] ?? 2);
        else {
          st.setPlaybackRate(1);
          p.play();
        }
      } else {
        st.setPlaybackRate(rates[Math.max(0, i - 1)] ?? 0.25);
        if (!p.isPlaying()) p.play();
      }
    }, []),
    goToStart: useCallback(() => {
      playerRef.current?.pause();
      playerRef.current?.seekTo(0);
    }, []),
    goToEnd: useCallback(() => {
      playerRef.current?.pause();
      playerRef.current?.seekTo(
        Math.max(
          0,
          (useEditorStore.getState().project
            ? calculateTimeline(useEditorStore.getState().project!).totalFrames
            : 1) - 1,
        ),
      );
    }, []),
    undo,
    redo,
    save: useCallback(() => void saveNow((p) => storage.projects.save(p)), [storage]),
    showHelp: useCallback(() => setShortcutsOpen(true), []),
    export: useCallback(() => setExportOpen(true), []),
    escape: useCallback(() => {
      setExportOpen(false);
      setShortcutsOpen(false);
      const sel = useEditorStore.getState().selection;
      if (sel.kind === 'overlay') select({ kind: 'scene', sceneId: sel.sceneId });
      else if (sel.kind === 'scene' || sel.kind === 'transition') select({ kind: 'project' });
    }, [select]),
  };
  useKeyboardShortcuts(handlers, !exportOpen && !recordSceneId && !musicOpen);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        onExport={() => setExportOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <LeftRail />
        <Group orientation="horizontal" id="vc-editor-h" className="min-h-0 flex-1">
          <Panel
            id="left"
            defaultSize="22%"
            minSize="16%"
            maxSize="36%"
            collapsible
            className="min-w-0 bg-surface"
          >
            {leftPanel === 'scenes' ? (
              <ScenesPanel />
            ) : leftPanel === 'script' ? (
              <ScriptPanel />
            ) : leftPanel === 'assets' ? (
              <AssetsPanel />
            ) : leftPanel === 'templates' ? (
              <TemplatesPanel />
            ) : (
              <BrandPanel />
            )}
          </Panel>
          <Handle />
          <Panel id="center" minSize="30%" className="min-w-0">
            <Group orientation="vertical" id="vc-editor-v">
              <Panel id="preview" defaultSize="72%" minSize="40%">
                <PreviewStage playerRef={playerRef} />
              </Panel>
              <Handle direction="vertical" />
              <Panel
                id="timeline"
                defaultSize="28%"
                minSize="15%"
                maxSize="50%"
                className="relative"
              >
                <Timeline playerRef={playerRef} />
              </Panel>
            </Group>
          </Panel>
          <Handle />
          <Panel
            id="inspector"
            defaultSize="24%"
            minSize="18%"
            maxSize="40%"
            collapsible
            className="min-w-0 bg-surface border-l border-border"
          >
            <Inspector />
          </Panel>
          {showProblems ? (
            <>
              <Handle />
              <Panel id="problems" defaultSize="18%" minSize="14%" maxSize="30%">
                <ProblemsPanel />
              </Panel>
            </>
          ) : null}
        </Group>
      </div>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <MusicDialog open={musicOpen} onClose={() => openMusic(false)} />
      {recordSceneId ? (
        <RecordDialog
          open
          onClose={() => openRecorder(null)}
          sceneId={recordSceneId}
          playerRef={playerRef}
        />
      ) : null}
    </div>
  );
};
