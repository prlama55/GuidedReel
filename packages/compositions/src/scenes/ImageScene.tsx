import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ImageProps } from '@guidedreel/schema';
import { Media } from '../components/Media';
import { Body } from '../components/Layout';
import { fadeIn, slideIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';
import { imageMotion } from '../animations/presets';

export const ImageScene: SceneComponent<ImageProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);
  const pad = Math.min(width, height) * 0.06;

  return (
    <AbsoluteFill
      style={{ backgroundColor: props.backgroundColor ?? theme.colors.background, ...motion }}
    >
      <AbsoluteFill
        style={{ opacity: fadeIn(frame, { duration: 12 }), padding: props.imageAssetId ? 0 : pad }}
      >
        <Media
          assetId={props.imageAssetId}
          fit={props.fit}
          zoom={props.mediaZoom}
          offsetX={props.mediaOffsetX}
          offsetY={props.mediaOffsetY}
          box={{ width, height }}
          rounded={false}
          placeholderLabel="Add an image"
          mediaStyle={imageMotion(props.motion, frame, durationInFrames)}
        />
      </AbsoluteFill>
      {props.caption ? (
        <AbsoluteFill style={{ justifyContent: 'flex-end', padding: pad }}>
          <div
            style={{
              ...slideIn(frame, { start: 8, duration: 18, from: 'up', distance: 40 }),
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(12px)',
              borderRadius: theme.radius * theme.scale,
              padding: `${22 * theme.scale}px ${32 * theme.scale}px`,
              alignSelf: 'flex-start',
              maxWidth: '100%',
            }}
          >
            <Body size={36} align="left" color={theme.colors.text}>
              {props.caption}
            </Body>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
