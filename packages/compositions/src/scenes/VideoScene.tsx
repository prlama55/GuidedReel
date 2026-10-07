import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VideoProps } from '@guidedreel/schema';
import { Media } from '../components/Media';
import { Body } from '../components/Layout';
import { fadeIn, slideIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const VideoScene: SceneComponent<VideoProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);
  const pad = Math.min(width, height) * 0.06;

  return (
    <AbsoluteFill
      style={{ backgroundColor: props.backgroundColor ?? theme.colors.background, ...motion }}
    >
      <AbsoluteFill style={{ opacity: fadeIn(frame, { duration: 10 }) }}>
        <Media
          assetId={props.videoAssetId}
          fit={props.fit}
          zoom={props.mediaZoom}
          offsetX={props.mediaOffsetX}
          offsetY={props.mediaOffsetY}
          box={{ width, height }}
          rounded={false}
          muted={props.muted}
          volume={props.volume}
          startFromFrames={Math.round(props.startFromSeconds * fps)}
          placeholderLabel="Add a video"
          style={props.videoAssetId ? undefined : { padding: pad }}
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
