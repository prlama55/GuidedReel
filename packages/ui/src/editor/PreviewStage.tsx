import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import {
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  Maximize2,
  Smartphone,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Type,
  ImagePlus,
  Smile,
  StepBack,
  StepForward,
  Gauge,
  Grid3x3,
  Volume1,
  Mic,
} from 'lucide-react';
import {
  VideoComposition,
  computeCompositionMetadata,
  mediaSlotSize,
} from '@guidedreel/compositions';
import { formatTimecode, calculateTimeline, secondsToFrames } from '@guidedreel/engine';
import { aspectRatioOf, getSceneDefinition } from '@guidedreel/schema';
import { useHost } from '../host/HostContext';
import { useAssetUrls } from '../hooks/useAssetUrls';
import { beginGroupedEdit, useEditorStore, useSelectedScene } from '../store/editor-store';
import { Button } from '../primitives/index';
import { OverlayEditor } from './OverlayEditor';
import { StickerPicker } from './StickerPicker';
import { useAssetImport } from '../hooks/useAssetImport';
import { cn } from '../lib/cn';

/**
 * Interactive preview with the Remotion Player and custom controls. The
 * Player is the only thing that re-renders when the project changes; nothing
 * is encoded until the user exports.
 */
export const PreviewStage: React.FC<{ playerRef: React.RefObject<PlayerRef | null> }> = ({
  playerRef,
}) => {
  const { assetResolver } = useHost();
  const project = useEditorStore((s) => s.project)!;
  const setFrame = useEditorStore((s) => s.setFrame);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const currentFrame = useEditorStore((s) => s.currentFrame);
  const showSafeZones = useEditorStore((s) => s.showSafeZones);
  const toggleSafeZones = useEditorStore((s) => s.toggleSafeZones);
  const select = useEditorStore((s) => s.select);
  const [loop, setLoop] = useState(true);
  const [loopScene, setLoopScene] = useState(false);
  const cropMode = useEditorStore((s) => s.cropMode);
  const setCropMode = useEditorStore((s) => s.setCropMode);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const showGuides = useEditorStore((s) => s.showGuides);
  const toggleGuides = useEditorStore((s) => s.toggleGuides);
  const playbackRate = useEditorStore((s) => s.playbackRate);
  const setPlaybackRate = useEditorStore((s) => s.setPlaybackRate);
  const updateSceneProps = useEditorStore((s) => s.updateSceneProps);
  const selectedScene = useSelectedScene();
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const openRecorder = useEditorStore((s) => s.openRecorder);
  const { importFiles } = useAssetImport();
  const { platform } = useHost();

  const [stickerOpen, setStickerOpen] = useState(false);
  const addSticker = (sticker: { codepoint: string }, animated: boolean) => {
    if (!selectedScene) return;
    // Square sticker, 22% of the frame width.
    const width = 0.22;
    addOverlay(selectedScene.id, {
      kind: 'emoji',
      codepoint: sticker.codepoint,
      animated,
      x: 0.5,
      y: 0.5,
      width,
      animation: 'pop',
    });
  };
  const addTextOverlay = () => {
    if (!selectedScene) return;
    addOverlay(selectedScene.id, { kind: 'text', text: 'Your text', x: 0.5, y: 0.5, width: 0.7 });
  };
  const addMediaOverlay = async () => {
    if (!selectedScene) return;
    const [asset] = await importFiles(
      await platform.pickFiles({ multiple: false, assetTypes: ['image', 'video', 'logo'] }),
    );
    if (!asset) return;
    // Size from the asset's aspect ratio, 40% of the frame width.
    const fw = project.format.width;
    const fh = project.format.height;
    const aspect = asset.width && asset.height ? asset.height / asset.width : 1;
    const width = 0.4;
    const height = Math.min(1, (width * fw * aspect) / fh);
    addOverlay(selectedScene.id, {
      kind: 'media',
      assetId: asset.id,
      x: 0.5,
      y: 0.5,
      width,
      height,
    });
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const assetUrls = useAssetUrls(project.assets, assetResolver);
  const meta = useMemo(() => computeCompositionMetadata(project), [project]);
  const inputProps = useMemo(() => ({ project, assetUrls }), [project, assetUrls]);
  const timeline = useMemo(() => calculateTimeline(project), [project]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The Player mounts only after the stage is measured, so listeners are
  // attached from a callback ref rather than a mount-time effect.
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const attachPlayer = useCallback(
    (p: PlayerRef | null) => {
      playerRef.current = p;
      setPlayer(p);
    },
    [playerRef],
  );
  useEffect(() => {
    const p = player;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onEnded);
    setFrame(p.getCurrentFrame());
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onEnded);
      setPlaying(false);
    };
  }, [player, setFrame, setPlaying]);

  // Selecting a scene anywhere seeks the (paused) player to it.
  const selection = useEditorStore((s) => s.selection);
  const selectedSceneId =
    selection.kind === 'scene' || selection.kind === 'transition' ? selection.sceneId : undefined;
  useEffect(() => {
    if (isPlaying || !selectedSceneId) return;
    const item = timeline.scenes[selectedSceneId];
    if (!item) return;
    const target =
      selection.kind === 'transition'
        ? item.startFrame
        : item.startFrame + Math.min(20, Math.floor(item.durationInFrames / 3));
    const frame = useEditorStore.getState().currentFrame;
    if (frame >= item.startFrame && frame < item.endFrame && selection.kind !== 'transition')
      return;
    playerRef.current?.seekTo(target);
    setFrame(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSceneId, selection.kind]);

  // Follow the playhead: select the scene under it while playing.
  useEffect(() => {
    if (!isPlaying) return;
    let current: string | undefined;
    for (const item of timeline.sceneOrder)
      if (currentFrame >= item.startFrame && currentFrame < item.endFrame) current = item.refId;
    if (current && !(selection.kind === 'scene' && selection.sceneId === current))
      select({ kind: 'scene', sceneId: current });
  }, [currentFrame, isPlaying, timeline, select, selection]);

  const fit = useMemo(() => {
    const pad = 24;
    const w = Math.max(0, box.w - pad * 2);
    const h = Math.max(0, box.h - pad * 2);
    const scale = Math.min(w / meta.width, h / meta.height, 1.5);
    return { width: Math.floor(meta.width * scale), height: Math.floor(meta.height * scale) };
  }, [box, meta]);

  const togglePlay = useCallback(() => playerRef.current?.toggle(), [playerRef]);
  const seekTo = useCallback(
    (frame: number) => {
      const f = Math.max(0, Math.min(meta.durationInFrames - 1, Math.round(frame)));
      playerRef.current?.seekTo(f);
      setFrame(f);
    },
    [playerRef, meta.durationInFrames, setFrame],
  );
  const stepFrames = useCallback(
    (delta: number) => {
      playerRef.current?.pause();
      seekTo(useEditorStore.getState().currentFrame + delta);
    },
    [playerRef, seekTo],
  );
  /** Jump to the previous scene start (or the start of the current one if we are past its first second). */
  const previousScene = useCallback(() => {
    const f = useEditorStore.getState().currentFrame;
    const items = timeline.sceneOrder;
    const current = items.filter((i) => i.startFrame <= f).pop();
    if (!current) return seekTo(0);
    const target =
      f - current.startFrame > meta.fps
        ? current.startFrame
        : (items[items.indexOf(current) - 1]?.startFrame ?? 0);
    playerRef.current?.pause();
    seekTo(target);
  }, [timeline, meta.fps, playerRef, seekTo]);
  const nextScene = useCallback(() => {
    const f = useEditorStore.getState().currentFrame;
    const next = timeline.sceneOrder.find((i) => i.startFrame > f);
    playerRef.current?.pause();
    seekTo(next ? next.startFrame : meta.durationInFrames - 1);
  }, [timeline, meta.durationInFrames, playerRef, seekTo]);
  const ratio = aspectRatioOf(project.format);

  // Loop-scene mode confines playback to the selected scene.
  const sceneItem = selectedScene ? timeline.scenes[selectedScene.id] : undefined;
  const inFrame = loopScene && sceneItem ? sceneItem.startFrame : null;
  const outFrame =
    loopScene && sceneItem ? Math.max(sceneItem.startFrame, sceneItem.endFrame - 1) : null;

  // Crop mode: available when the selected scene has framed media assigned.
  const framing = useMemo(() => {
    if (!selectedScene) return null;
    const def = getSceneDefinition(selectedScene.type);
    if (!def.mediaKey || !selectedScene.props[def.mediaKey]) return null;
    const slot = mediaSlotSize(selectedScene.type, selectedScene.props, project.format);
    if (!slot) return null;
    return {
      sceneId: selectedScene.id,
      slot,
      zoom: Number(selectedScene.props.mediaZoom ?? 1),
      offsetX: Number(selectedScene.props.mediaOffsetX ?? 0),
      offsetY: Number(selectedScene.props.mediaOffsetY ?? 0),
    };
  }, [selectedScene, project.format]);
  const canCrop = framing !== null;
  useEffect(() => {
    if (!canCrop && cropMode) setCropMode(false);
  }, [canCrop, cropMode, setCropMode]);

  const setFraming = useCallback(
    (patch: { mediaZoom?: number; mediaOffsetX?: number; mediaOffsetY?: number }) => {
      if (!framing) return;
      const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
      const next: Record<string, number> = {};
      if (patch.mediaZoom !== undefined)
        next.mediaZoom = Math.round(clamp(patch.mediaZoom, 1, 4) * 100) / 100;
      if (patch.mediaOffsetX !== undefined)
        next.mediaOffsetX = Math.round(clamp(patch.mediaOffsetX, -1, 1) * 1000) / 1000;
      if (patch.mediaOffsetY !== undefined)
        next.mediaOffsetY = Math.round(clamp(patch.mediaOffsetY, -1, 1) * 1000) / 1000;
      updateSceneProps(framing.sceneId, next);
    },
    [framing, updateSceneProps],
  );
  const zoomBy = useCallback(
    (delta: number) => framing && setFraming({ mediaZoom: framing.zoom + delta }),
    [framing, setFraming],
  );
  const resetFraming = useCallback(
    () => setFraming({ mediaZoom: 1, mediaOffsetX: 0, mediaOffsetY: 0 }),
    [setFraming],
  );

  return (
    <div className="flex h-full flex-col bg-stage">
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        {fit.width > 0 ? (
          <div
            className="relative shadow-2xl shadow-black/60"
            style={{ width: fit.width, height: fit.height }}
            onPointerDown={(e) => {
              // Clicking the stage (not an overlay box) deselects the overlay and returns to the scene.
              if ((e.target as HTMLElement).closest('[data-testid^="overlay-box-"]')) return;
              const sel = useEditorStore.getState().selection;
              if (sel.kind === 'overlay') select({ kind: 'scene', sceneId: sel.sceneId });
            }}
          >
            <Player
              ref={attachPlayer}
              component={VideoComposition}
              inputProps={inputProps}
              durationInFrames={meta.durationInFrames}
              fps={meta.fps}
              compositionWidth={meta.width}
              compositionHeight={meta.height}
              style={{ width: '100%', height: '100%' }}
              controls={false}
              playbackRate={playbackRate}
              inFrame={inFrame}
              outFrame={outFrame}
              initialFrame={Math.min(20, Math.max(0, meta.durationInFrames - 1))}
              loop={loop}
              initiallyMuted={muted}
              clickToPlay={false}
              doubleClickToFullscreen
              spaceKeyToPlayOrPause={false}
              acknowledgeRemotionLicense
            />
            {showSafeZones && ratio === '9:16' ? <SafeZones /> : null}
            {showGuides ? <Guides /> : null}
            {!cropMode && selectedScene ? (
              <OverlayEditor
                scene={selectedScene}
                display={fit}
                frame={{ width: meta.width, height: meta.height }}
              />
            ) : null}
            {cropMode && framing ? (
              <CropOverlay
                key={framing.sceneId}
                framing={framing}
                displayScale={fit.width / meta.width}
                onChange={setFraming}
                onReset={resetFraming}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex h-11 items-center gap-0.5 border-t border-border bg-surface px-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousScene}
          aria-label="Previous scene"
          title="Previous scene (Home for the start)"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => stepFrames(-1)}
          aria-label="Previous frame"
          title="Previous frame (←)"
        >
          <StepBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          title={isPlaying ? 'Stop at the current frame (Space / K)' : 'Play (Space / L)'}
        >
          {isPlaying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => stepFrames(1)}
          aria-label="Next frame"
          title="Next frame (→)"
        >
          <StepForward className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextScene}
          aria-label="Next scene"
          title="Next scene (End for the end)"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <TimecodeInput
          frame={currentFrame}
          total={meta.durationInFrames}
          fps={meta.fps}
          onSeek={seekTo}
        />
        <input
          type="range"
          min={0}
          max={Math.max(0, meta.durationInFrames - 1)}
          value={Math.min(currentFrame, meta.durationInFrames - 1)}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="mx-2 h-1 min-w-[60px] flex-1 accent-primary"
          aria-label="Seek"
        />
        <label
          className="flex items-center gap-1 text-[11px] text-fg-muted"
          title="Playback speed (J slower / L faster)"
        >
          <Gauge className="h-3.5 w-3.5" />
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            aria-label="Playback speed"
            className="h-7 rounded border border-border bg-surface-2 px-1 font-mono text-[11px] tabular-nums text-fg"
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLoop((v) => !v)}
          aria-pressed={loop}
          aria-label="Loop"
          title="Loop playback"
          className={cn(loop && 'text-primary')}
        >
          <Repeat className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLoopScene((v) => !v)}
          aria-pressed={loopScene}
          aria-label="Play selected scene only"
          title="Play only the selected scene"
          disabled={!selectedScene}
          className={cn(loopScene && 'text-primary')}
        >
          <Repeat1 className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          onClick={addTextOverlay}
          aria-label="Add text overlay"
          title="Add text on top of this scene"
          disabled={!selectedScene}
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void addMediaOverlay()}
          aria-label="Add media overlay"
          title="Add an image, GIF, logo or video on top of this scene"
          disabled={!selectedScene}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectedScene && openRecorder(selectedScene.id)}
          aria-label="Record voiceover"
          title="Record a voiceover for this scene"
          disabled={!selectedScene}
        >
          <Mic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStickerOpen(true)}
          aria-label="Add sticker"
          title="Add an emoji sticker (animated or static)"
          disabled={!selectedScene}
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCropMode(!cropMode)}
          aria-pressed={cropMode}
          aria-label="Crop and reposition media"
          title={
            canCrop
              ? 'Crop: drag to reposition, scroll to zoom'
              : 'Select a scene with media to crop'
          }
          disabled={!canCrop}
          className={cn(cropMode && 'text-primary')}
        >
          <Crop className="h-4 w-4" />
        </Button>
        {cropMode && framing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => zoomBy(-0.25)}
              aria-label="Zoom out media"
              title="Zoom out"
              disabled={framing.zoom <= 1}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span
              data-testid="crop-zoom"
              className="w-10 text-center font-mono text-[11px] tabular-nums text-fg-muted"
            >
              {framing.zoom.toFixed(2)}×
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => zoomBy(0.25)}
              aria-label="Zoom in media"
              title="Zoom in"
              disabled={framing.zoom >= 4}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFraming}
              aria-label="Reset framing"
              title="Reset zoom and position"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        ) : null}
        <div className="group/vol relative flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMuted((m) => {
                const next = !m;
                if (next) playerRef.current?.mute();
                else playerRef.current?.unmute();
                return next;
              });
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : volume < 0.5 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              playerRef.current?.setVolume(v);
              if (v > 0 && muted) {
                setMuted(false);
                playerRef.current?.unmute();
              }
            }}
            aria-label="Preview volume"
            className="w-0 overflow-hidden accent-primary opacity-0 transition-all group-hover/vol:ml-1 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:ml-1 focus:w-20 focus:opacity-100"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleGuides}
          aria-pressed={showGuides}
          aria-label="Toggle guides"
          title="Centre lines and thirds grid; overlays snap to them"
          className={cn(showGuides && 'text-primary')}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSafeZones}
          aria-pressed={showSafeZones}
          aria-label="Toggle safe zones"
          title="Platform safe zones"
          className={cn(
            showSafeZones && ratio === '9:16' && 'text-primary',
            ratio !== '9:16' && 'opacity-40',
          )}
          disabled={ratio !== '9:16'}
        >
          <Smartphone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => playerRef.current?.requestFullscreen()}
          aria-label="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <StickerPicker open={stickerOpen} onClose={() => setStickerOpen(false)} onPick={addSticker} />
    </div>
  );
};

/** Approximate UI overlays of Reels / Shorts / TikTok on a 9:16 frame. */
const SafeZones: React.FC = () => (
  <div className="pointer-events-none absolute inset-0" aria-hidden>
    <div className="absolute inset-x-0 top-0 h-[12%] bg-white/5 border-b border-dashed border-white/25" />
    <div className="absolute inset-x-0 bottom-0 h-[20%] bg-white/5 border-t border-dashed border-white/25" />
    <div className="absolute right-0 top-[45%] h-[35%] w-[14%] bg-white/5 border-l border-dashed border-white/25" />
    <div className="absolute left-2 top-[12.5%] text-[9px] uppercase tracking-wider text-white/50">
      safe zone
    </div>
  </div>
);

type Framing = {
  sceneId: string;
  slot: { width: number; height: number };
  zoom: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Transparent layer over the player while Crop mode is on. Dragging pans the
 * media within its slot, the wheel zooms, double-click resets. Each drag or
 * zoom burst is one undo entry.
 */
const CropOverlay: React.FC<{
  framing: Framing;
  displayScale: number;
  onChange: (p: { mediaZoom?: number; mediaOffsetX?: number; mediaOffsetY?: number }) => void;
  onReset: () => void;
}> = ({ framing, displayScale, onChange, onReset }) => {
  const drag = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    end: () => void;
  } | null>(null);
  const wheelEnd = useRef<{ end: () => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const latest = useRef(framing);
  latest.current = framing;

  useEffect(
    () => () => {
      drag.current?.end();
      wheelEnd.current?.end();
    },
    [],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: latest.current.offsetX,
      offsetY: latest.current.offsetY,
      end: beginGroupedEdit(),
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // Offsets are fractions of half the slot: moving the full slot width equals 2 units.
    const slotW = latest.current.slot.width * displayScale;
    const slotH = latest.current.slot.height * displayScale;
    const dx = ((e.clientX - d.x) / Math.max(1, slotW)) * 2;
    const dy = ((e.clientY - d.y) / Math.max(1, slotH)) * 2;
    onChange({
      mediaOffsetX: d.offsetX + dx / latest.current.zoom,
      mediaOffsetY: d.offsetY + dy / latest.current.zoom,
    });
  };
  const onPointerUp = () => {
    drag.current?.end();
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!wheelEnd.current)
      wheelEnd.current = { end: beginGroupedEdit(), timer: setTimeout(() => undefined, 0) };
    clearTimeout(wheelEnd.current.timer);
    wheelEnd.current.timer = setTimeout(() => {
      wheelEnd.current?.end();
      wheelEnd.current = null;
    }, 400);
    const factor = Math.exp(-e.deltaY * 0.0015);
    onChange({ mediaZoom: latest.current.zoom * factor });
  };

  return (
    <div
      role="application"
      aria-label="Crop media: drag to reposition, scroll to zoom, double-click to reset"
      className="absolute inset-0 cursor-move select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onReset}
    >
      <div className="pointer-events-none absolute inset-0 border-2 border-primary/70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] text-white">
          Drag to reposition · Scroll to zoom · Double-click to reset
        </span>
      </div>
    </div>
  );
};

/** Centre lines and rule-of-thirds grid for positioning. */
const Guides: React.FC = () => (
  <div className="pointer-events-none absolute inset-0" aria-hidden>
    <div className="absolute inset-y-0 left-1/2 w-px bg-primary/60" />
    <div className="absolute inset-x-0 top-1/2 h-px bg-primary/60" />
    <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
    <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
    <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
    <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
  </div>
);

/** Timecode readout that becomes an input on click: type mm:ss, mm:ss.ff or plain seconds. */
const TimecodeInput: React.FC<{
  frame: number;
  total: number;
  fps: number;
  onSeek: (frame: number) => void;
}> = ({ frame, total, fps, onSeek }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const commit = () => {
    const parsed = parseTimecode(draft, fps);
    if (parsed !== null) onSeek(parsed);
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        aria-label="Go to time"
        className="ml-2 h-7 w-24 rounded border border-primary bg-surface-2 px-1.5 font-mono text-xs tabular-nums text-fg"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(formatTimecode(frame, fps));
        setEditing(true);
      }}
      title="Click to type a time (mm:ss.ff or seconds)"
      aria-label="Current time"
      className="ml-1 shrink-0 whitespace-nowrap rounded px-1 font-mono text-[11px] tabular-nums text-fg-muted hover:bg-surface-3 hover:text-fg"
    >
      {formatTimecode(frame, fps)}{' '}
      <span className="text-fg-subtle">/ {formatTimecode(total, fps)}</span>
    </button>
  );
};

/** Accepts "12", "12.5", "1:04", "01:04.12" (frames after the dot when two parts are colon-separated). */
export function parseTimecode(input: string, fps: number): number | null {
  const t = input.trim();
  if (!t) return null;
  const m = /^(?:(\d+):)?(\d+)(?:\.(\d+))?$/.exec(t);
  if (!m) return null;
  const minutes = m[1] ? Number(m[1]) : 0;
  const seconds = Number(m[2]);
  const fraction = m[3] ?? '';
  const frames = m[1] ? Number(fraction || 0) : Math.round(Number(`0.${fraction || '0'}`) * fps);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(frames))
    return null;
  return secondsToFrames(minutes * 60 + seconds, fps) + frames;
}
