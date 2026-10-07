import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { EmojiOverlay, MediaOverlay, Overlay, TextOverlay } from '@guidedreel/schema';
import { Gif } from '@remotion/gif';
import { notoAnimatedGifUrl, notoStaticSvgUrl } from '@guidedreel/engine';
import { useAsset, useTheme } from '../context';
import { animateElement } from '../animations/presets';
import { fontStack } from '../theme';

/**
 * Free-positioned text and media drawn over a scene, in array (z) order.
 * Positions and sizes are fractions of the frame so the same overlay lands in
 * the same place in every format.
 */
export const Overlays: React.FC<{
  overlays: readonly Overlay[];
  sceneDurationInFrames: number;
}> = ({ overlays, sceneDurationInFrames }) => {
  if (overlays.length === 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {overlays.map((o) => {
        const from = Math.min(o.startOffsetFrames, Math.max(0, sceneDurationInFrames - 1));
        const duration = Math.max(
          1,
          Math.min(
            o.durationInFrames ?? sceneDurationInFrames - from,
            sceneDurationInFrames - from,
          ),
        );
        return (
          <Sequence
            key={o.id}
            from={from}
            durationInFrames={duration}
            layout="none"
            name={`overlay ${o.kind}`}
          >
            <OverlayItem overlay={o} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

function useOverlayStyle(overlay: Overlay): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return animateElement(overlay, frame, fps, durationInFrames, 60);
}

const OverlayItem: React.FC<{ overlay: Overlay }> = ({ overlay }) => {
  const { width, height } = useVideoConfig();
  const enter = useOverlayStyle(overlay);
  const box: React.CSSProperties = {
    position: 'absolute',
    left: overlay.x * width,
    top: overlay.y * height,
    width: overlay.width * width,
    ...(overlay.kind === 'media'
      ? { height: overlay.height * height }
      : overlay.kind === 'emoji'
        ? { height: overlay.width * width }
        : {}),
    // Centre on (x, y), then rotate; the enter animation's transform composes after.
    transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) ${enter.transform ?? ''}`,
    transformOrigin: 'center',
    opacity: (overlay.opacity ?? 1) * (typeof enter.opacity === 'number' ? enter.opacity : 1),
    filter: enter.filter,
    clipPath: enter.clipPath,
  };
  return (
    <div style={box}>
      {overlay.kind === 'text' ? (
        <TextItem overlay={overlay} />
      ) : overlay.kind === 'emoji' ? (
        <EmojiItem overlay={overlay} />
      ) : (
        <MediaItem overlay={overlay} />
      )}
    </div>
  );
};

const TextItem: React.FC<{ overlay: TextOverlay }> = ({ overlay }) => {
  const theme = useTheme();
  const s = theme.scale;
  return (
    <div
      style={{
        width: '100%',
        fontFamily: overlay.fontFamily ? fontStack(overlay.fontFamily) : theme.fonts.heading,
        fontSize: overlay.fontSize * s,
        fontWeight: overlay.weight,
        lineHeight: 1.15,
        textAlign: overlay.align,
        color: overlay.color ?? theme.colors.text,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        textShadow: overlay.background ? undefined : '0 2px 24px rgba(0,0,0,0.45)',
        ...(overlay.background
          ? {
              background: overlay.background,
              padding: `${0.35 * overlay.fontSize * s}px ${0.6 * overlay.fontSize * s}px`,
              borderRadius: 0.35 * overlay.fontSize * s,
              display: 'inline-block',
              boxSizing: 'border-box',
            }
          : {}),
      }}
    >
      {overlay.text}
    </div>
  );
};

const MediaItem: React.FC<{ overlay: MediaOverlay }> = ({ overlay }) => {
  const { url, asset } = useAsset(overlay.assetId);
  const { width, height } = useVideoConfig();
  const short = Math.min(overlay.width * width, overlay.height * height);
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: overlay.fit,
    borderRadius: overlay.radius * short,
    boxShadow: overlay.shadow ? '0 18px 60px rgba(0,0,0,0.45)' : undefined,
    display: 'block',
  };
  if (!url)
    return (
      <div
        style={{
          ...style,
          background: 'rgba(255,255,255,0.08)',
          border: '2px dashed rgba(255,255,255,0.3)',
        }}
      />
    );
  if (asset?.type === 'video')
    return <OffthreadVideo src={url} muted={overlay.muted} style={style} />;
  return <Img src={url} style={style} />;
};

export function isGif(mimeType?: string, name?: string): boolean {
  return mimeType === 'image/gif' || /\.gif$/i.test(name ?? '');
}

/** Noto emoji sticker: animated GIF synchronised to the timeline, or the static SVG. */
const EmojiItem: React.FC<{ overlay: EmojiOverlay }> = ({ overlay }) => {
  const style: React.CSSProperties = { width: '100%', height: '100%', display: 'block' };
  if (overlay.animated) {
    return (
      <Gif
        src={notoAnimatedGifUrl(overlay.codepoint)}
        fit="contain"
        playbackRate={overlay.playbackRate}
        loopBehavior="loop"
        style={style}
      />
    );
  }
  return (
    <Img src={notoStaticSvgUrl(overlay.codepoint)} style={{ ...style, objectFit: 'contain' }} />
  );
};
