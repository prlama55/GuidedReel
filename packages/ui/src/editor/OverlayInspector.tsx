import {
  ArrowDown,
  ArrowUp,
  Copy,
  Lock,
  LockOpen,
  Trash2,
  Type,
  Image as ImageIcon,
  Smile,
  ArrowLeft,
} from 'lucide-react';
import type { Overlay, TextOverlay, MediaOverlay, EmojiOverlay } from '@guidedreel/schema';
import { findSticker, emojiFromCodepoint, notoStaticSvgUrl } from '@guidedreel/engine';
import {
  ENTER_ANIMATION_OPTIONS,
  EXIT_ANIMATION_OPTIONS,
  LOOP_ANIMATION_OPTIONS,
} from '@guidedreel/schema';
import { framesToSeconds, secondsToFrames } from '@guidedreel/engine';
import {
  Button,
  Field,
  Input,
  Select,
  Slider,
  Switch,
  Textarea,
  SectionTitle,
} from '../primitives/index';
import { useEditorStore } from '../store/editor-store';
import { AlignmentField, AssetField, ColorField } from './inspector/fields';
import { useHost } from '../host/HostContext';
import { AssetPreview } from './AssetPreview';
import { useAssetImport } from '../hooks/useAssetImport';

export const OverlayInspector: React.FC<{
  sceneId: string;
  overlay: Overlay;
  sceneDurationInFrames: number;
}> = ({ sceneId, overlay, sceneDurationInFrames }) => {
  const project = useEditorStore((s) => s.project)!;
  const updateOverlay = useEditorStore((s) => s.updateOverlay);
  const removeOverlay = useEditorStore((s) => s.removeOverlay);
  const duplicateOverlay = useEditorStore((s) => s.duplicateOverlay);
  const reorderOverlay = useEditorStore((s) => s.reorderOverlay);
  const select = useEditorStore((s) => s.select);
  const { platform } = useHost();
  const { importFiles } = useAssetImport();
  const fps = project.format.fps;
  const scene = project.scenes.find((s) => s.id === sceneId);
  const index = scene?.overlays.findIndex((o) => o.id === overlay.id) ?? -1;
  const count = scene?.overlays.length ?? 0;
  const set = (patch: Partial<Overlay>) => updateOverlay(sceneId, overlay.id, patch);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => select({ kind: 'scene', sceneId })}
            aria-label="Back to scene"
            title="Back to the scene settings (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to scene
          </Button>
          <div className="flex items-center">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => set({ locked: !overlay.locked })}
              aria-label={overlay.locked ? 'Unlock overlay' : 'Lock overlay'}
              title={overlay.locked ? 'Unlock position' : 'Lock position'}
            >
              {overlay.locked ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => duplicateOverlay(sceneId, overlay.id)}
              aria-label="Duplicate overlay"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeOverlay(sceneId, overlay.id)}
              aria-label="Delete overlay"
              className="hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/15 text-primary">
            {overlay.kind === 'text' ? (
              <Type className="h-4 w-4" />
            ) : overlay.kind === 'emoji' ? (
              <Smile className="h-4 w-4" />
            ) : (
              <AssetPreview
                assetId={overlay.assetId}
                className="h-7 w-7"
                fit="cover"
                fallback={<ImageIcon className="h-4 w-4" />}
              />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {overlay.kind === 'text'
                ? 'Text overlay'
                : overlay.kind === 'emoji'
                  ? 'Sticker overlay'
                  : 'Media overlay'}
            </div>
            <div className="text-[10px] text-fg-subtle">
              Layer {index + 1} of {count}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        {overlay.kind === 'text' ? (
          <TextFields overlay={overlay} set={set} />
        ) : overlay.kind === 'emoji' ? (
          <EmojiFields overlay={overlay} set={set} />
        ) : (
          <MediaFields
            overlay={overlay}
            set={set}
            onUpload={async () => {
              const [a] = await importFiles(
                await platform.pickFiles({
                  multiple: false,
                  assetTypes: ['image', 'video', 'logo'],
                }),
              );
              if (a) set({ assetId: a.id } as Partial<Overlay>);
            }}
          />
        )}

        <Group title="Position & size">
          <p className="text-[11px] text-fg-muted">
            Drag the overlay in the preview to move it; drag its corner to resize. Arrow keys nudge
            the selected overlay.
          </p>
          <Field label="Horizontal" hint={`${Math.round(overlay.x * 100)}%`}>
            <Slider
              value={overlay.x}
              min={0}
              max={1}
              step={0.005}
              onChange={(v) => set({ x: v })}
              aria-label="Horizontal position"
            />
          </Field>
          <Field label="Vertical" hint={`${Math.round(overlay.y * 100)}%`}>
            <Slider
              value={overlay.y}
              min={0}
              max={1}
              step={0.005}
              onChange={(v) => set({ y: v })}
              aria-label="Vertical position"
            />
          </Field>
          <Field label="Width" hint={`${Math.round(overlay.width * 100)}% of frame`}>
            <Slider
              value={overlay.width}
              min={0.05}
              max={1}
              step={0.005}
              onChange={(v) => set({ width: v })}
              aria-label="Width"
            />
          </Field>
          {overlay.kind === 'media' ? (
            <Field label="Height" hint={`${Math.round(overlay.height * 100)}% of frame`}>
              <Slider
                value={overlay.height}
                min={0.05}
                max={1}
                step={0.005}
                onChange={(v) => set({ height: v } as Partial<Overlay>)}
                aria-label="Height"
              />
            </Field>
          ) : null}
          <Field label="Rotation" hint={`${Math.round(overlay.rotation)}°`}>
            <Slider
              value={overlay.rotation}
              min={-180}
              max={180}
              step={1}
              onChange={(v) => set({ rotation: v })}
              aria-label="Rotation"
            />
          </Field>
          <Field label="Opacity" hint={`${Math.round(overlay.opacity * 100)}%`}>
            <Slider
              value={overlay.opacity}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => set({ opacity: v })}
              aria-label="Opacity"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => reorderOverlay(sceneId, overlay.id, 1)}
              disabled={index >= count - 1}
            >
              <ArrowUp className="h-3.5 w-3.5" /> Bring forward
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reorderOverlay(sceneId, overlay.id, -1)}
              disabled={index <= 0}
            >
              <ArrowDown className="h-3.5 w-3.5" /> Send backward
            </Button>
          </div>
        </Group>

        <Group title="Timing & animation">
          <Field
            label="Appears after"
            hint={`${framesToSeconds(overlay.startOffsetFrames, fps).toFixed(1)}s`}
          >
            <Slider
              value={overlay.startOffsetFrames}
              min={0}
              max={Math.max(0, sceneDurationInFrames - 1)}
              step={1}
              onChange={(v) => set({ startOffsetFrames: v })}
              aria-label="Start offset"
            />
          </Field>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="font-medium text-fg-muted">Visible until the scene ends</span>
            <Switch
              checked={overlay.durationInFrames === undefined}
              onCheckedChange={(v) =>
                set({
                  durationInFrames: v
                    ? undefined
                    : Math.max(1, Math.round(sceneDurationInFrames / 2)),
                })
              }
              aria-label="Visible until scene ends"
            />
          </div>
          {overlay.durationInFrames !== undefined ? (
            <Field
              label="Visible for"
              hint={`${framesToSeconds(overlay.durationInFrames, fps).toFixed(1)}s`}
            >
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={Number(framesToSeconds(overlay.durationInFrames, fps).toFixed(1))}
                onChange={(e) =>
                  set({
                    durationInFrames: Math.max(1, secondsToFrames(Number(e.target.value), fps)),
                  })
                }
                className="w-24"
                aria-label="Visible duration"
              />
            </Field>
          ) : null}
          <Field label="Entrance">
            <Select
              value={overlay.animation}
              onChange={(e) => set({ animation: e.target.value as Overlay['animation'] })}
            >
              {ENTER_ANIMATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Entrance length"
            hint={`${framesToSeconds(overlay.enterDurationFrames, fps).toFixed(2)}s`}
          >
            <Slider
              value={overlay.enterDurationFrames}
              min={1}
              max={Math.min(120, fps * 2)}
              step={1}
              onChange={(v) => set({ enterDurationFrames: v })}
              aria-label="Entrance length"
            />
          </Field>
          <Field label="Exit">
            <Select
              value={overlay.exitAnimation}
              onChange={(e) => set({ exitAnimation: e.target.value as Overlay['exitAnimation'] })}
            >
              {EXIT_ANIMATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {overlay.exitAnimation !== 'none' ? (
            <Field
              label="Exit length"
              hint={`${framesToSeconds(overlay.exitDurationFrames, fps).toFixed(2)}s`}
            >
              <Slider
                value={overlay.exitDurationFrames}
                min={1}
                max={Math.min(120, fps * 2)}
                step={1}
                onChange={(v) => set({ exitDurationFrames: v })}
                aria-label="Exit length"
              />
            </Field>
          ) : null}
          <Field label="Loop" description="Continuous motion after the entrance.">
            <Select
              value={overlay.loopAnimation}
              onChange={(e) => set({ loopAnimation: e.target.value as Overlay['loopAnimation'] })}
            >
              {LOOP_ANIMATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </Group>
      </div>
    </div>
  );
};

const TextFields: React.FC<{ overlay: TextOverlay; set: (p: Partial<Overlay>) => void }> = ({
  overlay,
  set,
}) => (
  <Group title="Text">
    <Field label="Text" hint={`${overlay.text.length}/500`}>
      <Textarea
        id="overlay-text"
        rows={3}
        value={overlay.text}
        maxLength={500}
        onChange={(e) => set({ text: e.target.value } as Partial<Overlay>)}
        autoFocus
      />
    </Field>
    <Field label="Size" hint={`${overlay.fontSize}`}>
      <Slider
        value={overlay.fontSize}
        min={12}
        max={300}
        step={1}
        onChange={(v) => set({ fontSize: v } as Partial<Overlay>)}
        aria-label="Font size"
      />
    </Field>
    <Field label="Weight">
      <Select
        value={overlay.weight}
        onChange={(e) => set({ weight: Number(e.target.value) } as Partial<Overlay>)}
      >
        {[300, 400, 500, 600, 700, 800, 900].map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </Select>
    </Field>
    <AlignmentField
      label="Alignment"
      value={overlay.align}
      onChange={(v) => set({ align: v as TextOverlay['align'] } as Partial<Overlay>)}
    />
    <ColorField
      label="Colour"
      value={overlay.color ?? ''}
      onChange={(v) => set({ color: v || undefined } as Partial<Overlay>)}
      allowEmpty
    />
    <ColorField
      label="Background"
      value={overlay.background ?? ''}
      onChange={(v) => set({ background: v || undefined } as Partial<Overlay>)}
      allowEmpty
    />
  </Group>
);

const EmojiFields: React.FC<{ overlay: EmojiOverlay; set: (p: Partial<Overlay>) => void }> = ({
  overlay,
  set,
}) => {
  const sticker = findSticker(overlay.codepoint);
  return (
    <Group title="Sticker">
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-2">
        <img src={notoStaticSvgUrl(overlay.codepoint)} alt="" className="h-10 w-10" />
        <div className="min-w-0 text-xs">
          <div className="font-medium">
            {sticker?.name ?? emojiFromCodepoint(overlay.codepoint)}
          </div>
          <div className="text-fg-subtle">Noto Emoji · {overlay.codepoint}</div>
        </div>
      </div>
      <div className="flex items-center justify-between py-1 text-xs">
        <span className="font-medium text-fg-muted">Animated</span>
        <Switch
          checked={overlay.animated}
          onCheckedChange={(v) => set({ animated: v } as Partial<Overlay>)}
          aria-label="Animated sticker"
        />
      </div>
      {overlay.animated ? (
        <Field label="Sticker speed" hint={`${overlay.playbackRate.toFixed(2)}×`}>
          <Slider
            value={overlay.playbackRate}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(v) => set({ playbackRate: v } as Partial<Overlay>)}
            aria-label="Sticker speed"
          />
        </Field>
      ) : null}
      <p className="text-[10px] text-fg-subtle">
        Change the sticker by adding a new one from the preview bar. Use the Add media button for
        your own GIF files.
      </p>
    </Group>
  );
};

const MediaFields: React.FC<{
  overlay: MediaOverlay;
  set: (p: Partial<Overlay>) => void;
  onUpload: () => void;
}> = ({ overlay, set, onUpload }) => {
  const project = useEditorStore((s) => s.project)!;
  return (
    <Group title="Media">
      <AssetField
        label="Asset"
        value={overlay.assetId}
        assets={project.assets}
        assetTypes={['image', 'video', 'logo']}
        onChange={(v) => v && set({ assetId: v } as Partial<Overlay>)}
        onUpload={onUpload}
      />
      <Field label="Fit">
        <Select
          value={overlay.fit}
          onChange={(e) => set({ fit: e.target.value as MediaOverlay['fit'] } as Partial<Overlay>)}
        >
          <option value="cover">Cover (fill)</option>
          <option value="contain">Contain (show whole)</option>
        </Select>
      </Field>
      <Field label="Corner radius" hint={`${Math.round(overlay.radius * 100)}%`}>
        <Slider
          value={overlay.radius}
          min={0}
          max={0.5}
          step={0.01}
          onChange={(v) => set({ radius: v } as Partial<Overlay>)}
          aria-label="Corner radius"
        />
      </Field>
      <div className="flex items-center justify-between py-1 text-xs">
        <span className="font-medium text-fg-muted">Drop shadow</span>
        <Switch
          checked={overlay.shadow}
          onCheckedChange={(v) => set({ shadow: v } as Partial<Overlay>)}
          aria-label="Shadow"
        />
      </div>
      <div className="flex items-center justify-between py-1 text-xs">
        <span className="font-medium text-fg-muted">Mute video</span>
        <Switch
          checked={overlay.muted}
          onCheckedChange={(v) => set({ muted: v } as Partial<Overlay>)}
          aria-label="Mute"
        />
      </div>
    </Group>
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <SectionTitle>{title}</SectionTitle>
    <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>
  </section>
);
