import { AbsoluteFill, Img, OffthreadVideo } from 'remotion';
import { Gif } from '@remotion/gif';
import type { MediaFit } from '@guidedreel/schema';
import { useAsset, useTheme } from '../context';
import { Placeholder } from './Placeholder';
import { resolveFit } from './fit';

export type MediaProps = {
  assetId?: string;
  fit?: MediaFit;
  /** Size of the slot the media fills, in composition pixels. Needed for `auto`. */
  box: { width: number; height: number };
  rounded?: boolean;
  muted?: boolean;
  volume?: number;
  startFromFrames?: number;
  /** Applied to the visible media (e.g. Ken Burns transform). */
  mediaStyle?: React.CSSProperties;
  /** Framing: 1 = as fitted, up to 4x. */
  zoom?: number;
  /** Framing offsets, -1..1 as a fraction of half the slot. */
  offsetX?: number;
  offsetY?: number;
  /** Draw a blurred copy of the media behind it when it does not fill the box. */
  blurBackdrop?: boolean;
  style?: React.CSSProperties;
  placeholderLabel?: string;
};

/**
 * Renders an image or video asset so that it always fits its slot: cover when
 * the aspect ratios are close, otherwise contain over a blurred backdrop.
 */
export const Media: React.FC<MediaProps> = ({
  assetId,
  fit = 'auto',
  box,
  rounded = true,
  muted = true,
  volume = 1,
  startFromFrames = 0,
  mediaStyle,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
  blurBackdrop = true,
  style,
  placeholderLabel,
}) => {
  const theme = useTheme();
  const { url, asset } = useAsset(assetId);
  const radius = rounded ? theme.radius * theme.scale : 0;
  const frame: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: radius,
    overflow: 'hidden',
    ...style,
  };

  if (!url) {
    return (
      <div style={frame}>
        <Placeholder label={placeholderLabel} />
      </div>
    );
  }

  const resolved = resolveFit(fit, asset, box);
  const isVideo = asset?.type === 'video';
  const gif = asset?.mimeType === 'image/gif' || /\.gif$/i.test(asset?.name ?? '');
  const render = (layerStyle: React.CSSProperties, muteLayer: boolean) =>
    gif ? (
      <Gif
        src={url}
        fit={(layerStyle.objectFit as 'cover' | 'contain' | undefined) ?? 'cover'}
        loopBehavior="loop"
        style={layerStyle}
      />
    ) : isVideo ? (
      <OffthreadVideo
        src={url}
        muted={muteLayer}
        volume={muteLayer ? 0 : volume}
        startFrom={startFromFrames}
        style={layerStyle}
      />
    ) : (
      <Img src={url} style={layerStyle} />
    );

  const full: React.CSSProperties = { width: '100%', height: '100%' };
  const framing = `translate(${offsetX * 50}%, ${offsetY * 50}%) scale(${zoom})`;
  const foreground: React.CSSProperties = {
    ...full,
    objectFit: resolved,
    ...mediaStyle,
    transform: [framing, mediaStyle?.transform].filter(Boolean).join(' '),
    transformOrigin: 'center',
  };

  return (
    <div style={frame}>
      {resolved === 'contain' && blurBackdrop ? (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          {render(
            {
              ...full,
              objectFit: 'cover',
              transform: 'scale(1.2)',
              filter: `blur(${Math.round(28 * theme.scale)}px) brightness(0.55) saturate(1.1)`,
            },
            true,
          )}
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill>{render(foreground, muted)}</AbsoluteFill>
    </div>
  );
};
