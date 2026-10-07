import { useEffect, useRef } from 'react';
import type { Overlay, VideoScene } from '@guidedreel/schema';
import { beginGroupedEdit, useEditorStore } from '../store/editor-store';
import { designScale, fontStack } from '@guidedreel/compositions';
import { cn } from '../lib/cn';

type Props = {
  scene: VideoScene;
  /** Displayed player size in CSS px. */
  display: { width: number; height: number };
  /** Composition size in px. */
  frame: { width: number; height: number };
};

/**
 * Direct-manipulation layer over the preview for the selected scene's
 * overlays: click to select, drag to move, corner handle to resize
 * (proportionally for media, width for text), double-click text to edit in
 * the inspector. Each drag is one undo step. Positions stay fractions of the
 * frame so they hold in every format.
 */
export const OverlayEditor: React.FC<Props> = ({ scene, display, frame }) => {
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const drag = useRef<{
    mode: 'move' | 'resize';
    overlay: Overlay;
    startX: number;
    startY: number;
    end: () => void;
  } | null>(null);

  useEffect(() => () => drag.current?.end(), []);

  const scale = display.width / frame.width;
  const project = useEditorStore((s) => s.project);
  const headingFont =
    project?.brand?.fonts.find((f) => f.role === 'heading')?.family ?? project?.settings.fontFamily;
  const selectedId =
    selection.kind === 'overlay' && selection.sceneId === scene.id
      ? selection.overlayId
      : undefined;

  const begin = (e: React.PointerEvent, overlay: Overlay, mode: 'move' | 'resize') => {
    if (e.button !== 0 || overlay.locked) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    select({ kind: 'overlay', sceneId: scene.id, overlayId: overlay.id });
    drag.current = { mode, overlay, startX: e.clientX, startY: e.clientY, end: beginGroupedEdit() };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / display.width;
    const dy = (e.clientY - d.startY) / display.height;
    if (d.mode === 'move') {
      // Snap to the centre lines, thirds and edges unless Alt is held.
      const snap = (v: number, size: number) => {
        if (e.altKey) return v;
        const targets = [0.5, 1 / 3, 2 / 3, size / 2, 1 - size / 2];
        for (const t of targets) if (Math.abs(v - t) < 0.012) return t;
        return v;
      };
      const ow = d.overlay.width;
      const oh =
        d.overlay.kind === 'media'
          ? d.overlay.height
          : d.overlay.kind === 'emoji'
            ? (d.overlay.width * frame.width) / frame.height
            : 0.1;
      updateOverlay(scene.id, d.overlay.id, {
        x: clamp(snap(d.overlay.x + dx, ow), -0.5, 1.5),
        y: clamp(snap(d.overlay.y + dy, oh), -0.5, 1.5),
      });
    } else {
      // Resize from the bottom-right corner: dx grows width; media keeps its aspect ratio.
      const width = clamp(d.overlay.width + dx * 2, 0.02, 2);
      if (d.overlay.kind === 'media') {
        const aspect = (d.overlay.height * frame.height) / (d.overlay.width * frame.width);
        const height = clamp((width * frame.width * aspect) / frame.height, 0.02, 2);
        updateOverlay(scene.id, d.overlay.id, { width, height });
      } else {
        updateOverlay(scene.id, d.overlay.id, { width });
      }
    }
  };
  const end = () => {
    drag.current?.end();
    drag.current = null;
  };

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }}
      data-testid="overlay-editor"
    >
      {scene.overlays.map((o) => {
        const w = o.width * display.width;
        // Text boxes size themselves from a hidden mirror of the text (same font, size,
        // width and line height as the composition), so the outline follows wrapping.
        const h =
          o.kind === 'media'
            ? o.height * display.height
            : o.kind === 'emoji'
              ? o.width * display.width
              : undefined;
        const selected = o.id === selectedId;
        return (
          <div
            key={o.id}
            role="button"
            tabIndex={0}
            aria-label={`${o.kind === 'text' ? 'Text' : o.kind === 'emoji' ? 'Sticker' : 'Media'} overlay`}
            aria-pressed={selected}
            data-testid={`overlay-box-${o.id}`}
            onPointerDown={(e) => begin(e, o, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                select({ kind: 'overlay', sceneId: scene.id, overlayId: o.id });
            }}
            className={cn(
              'absolute touch-none select-none',
              o.locked ? 'cursor-default' : 'cursor-move',
              selected
                ? 'outline outline-2 outline-primary'
                : 'outline outline-1 outline-transparent hover:outline-primary/60',
            )}
            style={{
              pointerEvents: 'auto',
              left: o.x * display.width,
              top: o.y * display.height,
              width: w,
              height: h ?? 'auto',
              transform: `translate(-50%, -50%) rotate(${o.rotation}deg)`,
            }}
          >
            {o.kind === 'text' ? (
              <TextMirror overlay={o} scale={designScale(frame) * scale} fontFamily={headingFont} />
            ) : null}
            {selected ? (
              <>
                <span className="absolute -top-5 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-fg">
                  {o.kind === 'text' ? 'Text' : o.kind === 'emoji' ? 'Sticker' : 'Media'}
                </span>
                {!o.locked ? (
                  <span
                    role="slider"
                    aria-label="Resize overlay"
                    aria-valuenow={Math.round(o.width * 100)}
                    onPointerDown={(e) => begin(e, o, 'resize')}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-primary bg-surface"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Invisible copy of a text overlay with the composition's exact metrics. It gives
 * the editor box its real height (including wrapped lines and the background pill).
 */
const TextMirror: React.FC<{
  overlay: Extract<Overlay, { kind: 'text' }>;
  scale: number;
  fontFamily?: string;
}> = ({ overlay, scale, fontFamily }) => {
  const fs = overlay.fontSize * scale;
  return (
    <div
      aria-hidden
      style={{
        visibility: 'hidden',
        width: '100%',
        fontFamily: fontStack(overlay.fontFamily ?? fontFamily),
        fontSize: fs,
        fontWeight: overlay.weight,
        lineHeight: 1.15,
        textAlign: overlay.align,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        ...(overlay.background
          ? {
              padding: `${0.35 * fs}px ${0.6 * fs}px`,
              display: 'inline-block',
              boxSizing: 'border-box' as const,
            }
          : {}),
      }}
    >
      {overlay.text || ' '}
    </div>
  );
};

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
