import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Plus, Scissors, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import type { PlayerRef } from '@remotion/player';
import {
  TRANSITION_OPTIONS,
  getSceneDefinition,
  type SceneType,
  type VideoScene,
} from '@guidedreel/schema';
import {
  calculateTimeline,
  minSceneFrames,
  secondsToFrames,
  type TimelineItem,
} from '@guidedreel/engine';
import { useEditorStore } from '../store/editor-store';
import { Button, SceneIcon } from '../primitives/index';
import { formatSeconds } from '../lib/format';
import { cn } from '../lib/cn';
import { SceneTypePicker } from './panels/ScenesPanel';
import { AssetPreview, scenePreviewAssetId } from './AssetPreview';

const MIN_CARD = 64;

/**
 * Scene-based timeline: cards sized by duration, drag to reorder, drag the
 * right edge to change duration, transition chips between cards, a playhead
 * and a clickable ruler.
 */
export const Timeline: React.FC<{ playerRef: React.RefObject<PlayerRef | null> }> = ({
  playerRef,
}) => {
  const project = useEditorStore((s) => s.project)!;
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const moveScene = useEditorStore((s) => s.moveScene);
  const setSceneDuration = useEditorStore((s) => s.setSceneDuration);
  const updateSceneProps = useEditorStore((s) => s.updateSceneProps);
  const addScene = useEditorStore((s) => s.addScene);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const problems = useEditorStore((s) => s.problems);
  const [pxPerSecond, setPxPerSecond] = useState(56);
  const containerRef = useRef<HTMLDivElement>(null);
  const splitSceneAt = useEditorStore((s) => s.splitSceneAt);
  const [addAt, setAddAt] = useState<number | null>(null);
  const fps = project.format.fps;
  const timeline = useMemo(() => calculateTimeline(project), [project]);
  // Split is possible when both halves would meet the scene type's minimum length.
  const splitTarget = (() => {
    const item = timeline.sceneOrder.find(
      (i) => currentFrame > i.startFrame && currentFrame < i.endFrame - 1,
    );
    const scene = item && project.scenes.find((s) => s.id === item.refId);
    if (!item || !scene) return null;
    const at = currentFrame - item.startFrame;
    const min = minSceneFrames(scene, fps);
    return at >= min && scene.durationInFrames - at >= min ? { sceneId: scene.id, at } : null;
  })();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const widthFor = (frames: number) => Math.max(MIN_CARD, (frames / fps) * pxPerSecond);
  const visible = project.scenes.filter((s) => !s.hidden);
  const totalWidth = visible.reduce(
    (acc, s) => acc + widthFor(timeline.scenes[s.id]?.durationInFrames ?? s.durationInFrames),
    0,
  );
  const playheadX =
    (currentFrame / fps) *
    pxPerSecond *
    (totalWidth / Math.max(1, (timeline.totalFrames / fps) * pxPerSecond));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = project.scenes.findIndex((s) => s.id === active.id);
    const to = project.scenes.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    const ids = arrayMove(
      project.scenes.map((s) => s.id),
      from,
      to,
    );
    moveScene(String(active.id), ids.indexOf(String(active.id)));
  };

  const seekToScene = useCallback(
    (sceneId: string) => {
      const item = timeline.scenes[sceneId];
      if (item)
        playerRef.current?.seekTo(
          item.startFrame + Math.min(10, Math.floor(item.durationInFrames / 3)),
        );
    },
    [timeline, playerRef],
  );

  const onRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const frame = Math.round((x / pxPerSecond) * fps);
    playerRef.current?.seekTo(Math.max(0, Math.min(timeline.totalFrames - 1, frame)));
  };

  const seconds = Math.ceil(timeline.totalFrames / fps);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-8 items-center gap-2 border-b border-border px-2 text-xs text-fg-muted">
        <span className="font-medium">Timeline</span>
        <span className="text-fg-subtle">
          {visible.length} scenes · {formatSeconds(timeline.totalFrames / fps)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => splitTarget && splitSceneAt(splitTarget.sceneId, splitTarget.at)}
          aria-label="Split scene at playhead"
          title={
            splitTarget
              ? 'Split the scene under the playhead into two (S)'
              : 'Move the playhead inside a scene, far enough from its edges, to split it'
          }
          disabled={!splitTarget}
        >
          <Scissors className="h-3.5 w-3.5" /> Split
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const avail = (containerRef.current?.clientWidth ?? 800) - 140;
            const seconds = Math.max(1, timeline.totalFrames / fps);
            setPxPerSecond(Math.max(24, Math.min(200, Math.floor(avail / seconds))));
          }}
          aria-label="Zoom to fit"
          title="Fit the whole video in the timeline"
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPxPerSecond((z) => Math.max(24, z - 12))}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPxPerSecond((z) => Math.min(200, z + 12))}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div ref={containerRef} className="relative flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative min-w-full px-3 pt-1" style={{ width: totalWidth + 120 }}>
          <div
            className="relative h-5 cursor-pointer select-none"
            onClick={onRulerClick}
            role="slider"
            aria-label="Seek"
            aria-valuenow={currentFrame}
            tabIndex={0}
          >
            {Array.from({ length: seconds + 1 }).map((_, s) => (
              <div
                key={s}
                className="absolute top-0 flex flex-col items-start"
                style={{ left: s * pxPerSecond }}
              >
                <div className={cn('w-px bg-border-strong', s % 5 === 0 ? 'h-3' : 'h-1.5')} />
                {s % 5 === 0 ? (
                  <span className="text-[9px] text-fg-subtle tabular-nums">{s}s</span>
                ) : null}
              </div>
            ))}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={visible.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex items-stretch gap-0 py-1" style={{ height: 88 }}>
                {visible.map((scene, i) => {
                  const item = timeline.scenes[scene.id];
                  return (
                    <div key={scene.id} className="flex items-stretch">
                      {i > 0 ? (
                        <TransitionChip
                          sceneId={scene.id}
                          type={scene.transitionIn?.type ?? 'none'}
                          selected={
                            selection.kind === 'transition' && selection.sceneId === scene.id
                          }
                          onSelect={() => select({ kind: 'transition', sceneId: scene.id })}
                          onAdd={() => setAddAt(i)}
                        />
                      ) : null}
                      <SceneCard
                        scene={scene}
                        item={item}
                        index={i}
                        width={widthFor(item?.durationInFrames ?? scene.durationInFrames)}
                        selected={
                          (selection.kind === 'scene' || selection.kind === 'overlay') &&
                          selection.sceneId === scene.id
                        }
                        hasError={problems.some(
                          (p) => p.sceneId === scene.id && p.severity === 'error',
                        )}
                        hasWarning={problems.some((p) => p.sceneId === scene.id)}
                        onSelect={() => {
                          select({ kind: 'scene', sceneId: scene.id });
                          seekToScene(scene.id);
                        }}
                        onResize={(deltaPx) => {
                          // secondsToFrames clamps at 0, so keep the sign separate or shrinking is lost.
                          const deltaFrames =
                            Math.sign(deltaPx) *
                            secondsToFrames(Math.abs(deltaPx) / pxPerSecond, fps);
                          setSceneDuration(scene.id, scene.durationInFrames + deltaFrames);
                        }}
                        pxPerSecond={pxPerSecond}
                        onTrimStart={(removed) => {
                          // `removed` = frames cut from the front (committed once, on release).
                          if (removed === 0) return;
                          setSceneDuration(scene.id, scene.durationInFrames - removed);
                          // For video scenes, move the source in-point so the footage is trimmed, not just cut short.
                          if (scene.type === 'video') {
                            const current = Number(scene.props.startFromSeconds ?? 0);
                            updateSceneProps(scene.id, {
                              startFromSeconds: Math.max(0, current + removed / fps),
                            });
                          }
                        }}
                        fps={fps}
                      />
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setAddAt(visible.length)}
                  className="ml-2 flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-[10px] text-fg-subtle hover:border-border-strong hover:text-fg"
                  aria-label="Add scene at end"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </SortableContext>
          </DndContext>
          <div
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-accent"
            style={{ left: 12 + Math.min(playheadX, totalWidth) }}
          >
            <div className="-ml-[5px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-accent" />
          </div>
        </div>
      </div>
      {addAt !== null ? (
        <div className="absolute bottom-24 left-1/2 z-20 w-[360px] -translate-x-1/2 rounded-lg border border-border bg-surface p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">
              Add scene {addAt < visible.length ? `before #${addAt + 1}` : 'at the end'}
            </span>
            <button
              type="button"
              className="text-fg-subtle hover:text-fg"
              onClick={() => setAddAt(null)}
            >
              Cancel
            </button>
          </div>
          <SceneTypePicker
            compact
            onPick={(t: SceneType) => {
              addScene(t, addAt);
              setAddAt(null);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

const SceneCard: React.FC<{
  scene: VideoScene;
  item: TimelineItem | undefined;
  index: number;
  width: number;
  selected: boolean;
  hasError: boolean;
  hasWarning: boolean;
  onSelect: () => void;
  onResize: (deltaPx: number) => void;
  onTrimStart: (removedFrames: number) => void;
  pxPerSecond: number;
  fps: number;
}> = ({
  scene,
  item,
  index,
  width,
  selected,
  hasError,
  hasWarning,
  onSelect,
  onResize,
  onTrimStart,
  pxPerSecond,
  fps,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
  const def = getSceneDefinition(scene.type);
  const startX = useRef(0);
  const lastX = useRef(0);
  const frames = item?.durationInFrames ?? scene.durationInFrames;

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startX.current = e.clientX;
    lastX.current = e.clientX;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };
  const makeMoveHandler = (apply: (deltaPx: number) => void) => (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const delta = e.clientX - lastX.current;
    if (Math.abs(delta) >= 4) {
      apply(delta);
      lastX.current = e.clientX;
    }
  };
  const onPointerMove = makeMoveHandler(onResize);
  // Live left-trim: the card's left edge follows the pointer while the right edge stays put.
  const [trimPx, setTrimPx] = useState(0);
  const trimOrigin = useRef(0);
  const minFrames = minSceneFrames(scene, fps);
  const maxRemove = Math.max(0, frames - minFrames);
  const maxExtend = scene.type === 'video' ? Number(scene.props.startFromSeconds ?? 0) * fps : 0;
  const pxPerFrame = pxPerSecond / fps;
  const clampTrimFrames = (px: number) =>
    Math.max(-maxExtend, Math.min(maxRemove, Math.round(px / pxPerFrame)));
  const onTrimDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    trimOrigin.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTrimMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    setTrimPx(clampTrimFrames(e.clientX - trimOrigin.current) * pxPerFrame);
  };
  const onTrimUp = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (!el.hasPointerCapture(e.pointerId)) return;
    el.releasePointerCapture(e.pointerId);
    const removed = clampTrimFrames(e.clientX - trimOrigin.current);
    setTrimPx(0);
    onTrimStart(removed);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        width: Math.max(8, width - trimPx),
        marginLeft: trimPx,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'vc-scene-' + scene.type,
        'group relative flex shrink-0 cursor-grab flex-col overflow-hidden rounded-md border bg-surface-2 text-left',
        selected
          ? 'border-primary ring-1 ring-primary/50'
          : 'border-border hover:border-border-strong',
        isDragging && 'z-10 opacity-80 shadow-xl',
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Scene ${index + 1}: ${scene.title ?? def.label}, ${formatSeconds(frames / fps)}`}
    >
      <div className="h-1" style={{ background: 'var(--scene-color)' }} />
      <AssetPreview
        assetId={scenePreviewAssetId(scene)}
        className="pointer-events-none absolute inset-x-0 bottom-0 top-1 rounded-none bg-transparent opacity-40"
        fit="cover"
      />
      <div className="relative flex items-center gap-1 px-1.5 pt-1 text-[10px] font-medium">
        <SceneIcon type={scene.type} className="h-3 w-3" style={{ color: 'var(--scene-color)' }} />
        <span className="truncate">
          {index + 1}. {scene.title ?? def.label}
        </span>
      </div>
      <div className="relative mt-auto flex items-center justify-between px-1.5 pb-1 text-[10px] tabular-nums text-fg-subtle">
        <span>
          {formatSeconds(frames / fps)}
          {scene.durationMode === 'fromAudio' ? ' ♪' : ''}
        </span>
        {hasError ? (
          <span className="h-2 w-2 rounded-full bg-danger" title="Has errors" />
        ) : hasWarning ? (
          <span className="h-2 w-2 rounded-full bg-warning" title="Has warnings" />
        ) : null}
      </div>
      {scene.durationMode !== 'fromAudio' ? (
        <div
          onPointerDown={onTrimDown}
          onPointerMove={onTrimMove}
          onPointerUp={onTrimUp}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 top-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/40"
          title="Drag to trim the start"
        />
      ) : null}
      {scene.durationMode !== 'fromAudio' ? (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/40"
          title="Drag to change duration"
        />
      ) : null}
    </div>
  );
};

const TransitionChip: React.FC<{
  sceneId: string;
  type: string;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}> = ({ type, selected, onSelect, onAdd }) => {
  const label = TRANSITION_OPTIONS.find((o) => o.value === type)?.label ?? type;
  return (
    <div className="group/t relative flex w-7 shrink-0 flex-col items-center justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        title={`Transition: ${label}`}
        aria-label={`Transition: ${label}`}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border text-fg-subtle',
          selected
            ? 'border-primary bg-primary/20 text-primary'
            : type === 'none'
              ? 'border-border bg-surface'
              : 'border-border-strong bg-surface-3 text-fg',
        )}
      >
        <ArrowRightLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="absolute -bottom-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-primary text-white group-hover/t:flex"
        aria-label="Insert scene here"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
};
