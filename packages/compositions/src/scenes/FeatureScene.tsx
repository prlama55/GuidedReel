import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { FeatureProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { Media } from '../components/Media';
import { mediaSlotSize } from '../components/slots';
import { Body, Content, Heading, Pill, useIsLandscape } from '../components/Layout';
import { scaleIn, slideIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const FeatureScene: SceneComponent<FeatureProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = useTheme();
  const landscape = useIsLandscape();
  const motion = useSceneMotion(props, durationInFrames);
  const s = theme.scale;

  // In landscape, top/bottom layouts become side-by-side so media stays large.
  const layout =
    props.layout === 'text-only'
      ? 'text-only'
      : landscape && (props.layout === 'media-top' || props.layout === 'media-bottom')
        ? props.layout === 'media-top'
          ? 'media-left'
          : 'media-right'
        : props.layout;
  const horizontal = layout === 'media-left' || layout === 'media-right';
  const mediaFirst = layout === 'media-top' || layout === 'media-left';
  const mediaSize = mediaSlotSize('feature', props as Record<string, unknown>, {
    width,
    height,
  }) ?? { width: 0, height: 0 };

  const media =
    layout === 'text-only' ? null : (
      <div
        style={{
          ...mediaSize,
          transform: `scale(${scaleIn(frame, fps, { from: 0.9 })})`,
          flexShrink: 0,
        }}
      >
        <Media
          assetId={props.mediaAssetId}
          fit={props.fit}
          zoom={props.mediaZoom}
          offsetX={props.mediaOffsetX}
          offsetY={props.mediaOffsetY}
          box={mediaSize}
          placeholderLabel="Add media"
        />
      </div>
    );

  const text = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24 * s,
        alignItems: horizontal ? 'flex-start' : 'center',
        flex: horizontal ? 1 : undefined,
        minWidth: 0,
      }}
    >
      {props.badge ? (
        <div style={slideIn(frame, { start: 4, duration: 16, from: 'up', distance: 30 })}>
          <Pill>{props.badge}</Pill>
        </div>
      ) : null}
      <Heading
        size={horizontal ? 72 : 76}
        align={horizontal ? 'left' : 'center'}
        style={slideIn(frame, { start: 8, duration: 20, from: 'up', distance: 50 })}
      >
        {props.title}
      </Heading>
      {props.description ? (
        <Body
          size={38}
          align={horizontal ? 'left' : 'center'}
          style={slideIn(frame, { start: 16, duration: 20, from: 'up', distance: 40 })}
        >
          {props.description}
        </Body>
      ) : null}
    </div>
  );

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="gradient"
      />
      <Content
        style={{
          ...motion,
          flexDirection: horizontal ? 'row' : 'column',
          gap: 56 * s,
          justifyContent: 'center',
        }}
      >
        {mediaFirst ? media : null}
        {text}
        {!mediaFirst ? media : null}
      </Content>
    </>
  );
};
