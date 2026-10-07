import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { ProductProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { Media } from '../components/Media';
import { mediaSlotSize } from '../components/slots';
import { Body, Content, Heading, Pill, useIsLandscape } from '../components/Layout';
import { scaleIn, slideIn, staggerIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const ProductScene: SceneComponent<ProductProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const theme = useTheme();
  const landscape = useIsLandscape();
  const motion = useSceneMotion(props, durationInFrames);
  const s = theme.scale;
  const mediaSize = mediaSlotSize('product', props as Record<string, unknown>, {
    width,
    height,
  }) ?? { width: 0, height: 0 };

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="radial"
      />
      <Content style={{ ...motion, flexDirection: landscape ? 'row' : 'column', gap: 56 * s }}>
        <div
          style={{
            ...mediaSize,
            transform: `scale(${scaleIn(frame, fps, { from: 0.85 })})`,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <Media
            assetId={props.imageAssetId}
            fit={props.fit}
            zoom={props.mediaZoom}
            offsetX={props.mediaOffsetX}
            offsetY={props.mediaOffsetY}
            box={mediaSize}
            placeholderLabel="Add product image"
          />
          {props.price ? (
            <div
              style={{
                position: 'absolute',
                top: -20 * s,
                right: -20 * s,
                transform: `scale(${scaleIn(frame, fps, { start: 10, from: 0.5 })})`,
              }}
            >
              <Pill
                style={{
                  fontSize: 40 * s,
                  padding: `${14 * s}px ${30 * s}px`,
                  textTransform: 'none',
                }}
              >
                {props.price}
              </Pill>
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20 * s,
            alignItems: landscape ? 'flex-start' : 'center',
            flex: landscape ? 1 : undefined,
            minWidth: 0,
          }}
        >
          <Heading
            size={80}
            align={landscape ? 'left' : 'center'}
            style={slideIn(frame, { start: 6, duration: 20, from: 'up' })}
          >
            {props.name}
          </Heading>
          {props.tagline ? (
            <Body
              size={40}
              align={landscape ? 'left' : 'center'}
              style={slideIn(frame, { start: 12, duration: 20, from: 'up' })}
            >
              {props.tagline}
            </Body>
          ) : null}
          {props.bullets.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14 * s,
                marginTop: 10 * s,
                alignItems: 'flex-start',
              }}
            >
              {props.bullets.map((b, i) => (
                <div
                  key={i}
                  style={{
                    ...staggerIn(frame, i, fps, { start: 18, stagger: 6 }),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18 * s,
                  }}
                >
                  <div
                    style={{
                      width: 18 * s,
                      height: 18 * s,
                      borderRadius: 999,
                      background: theme.colors.accent,
                      flexShrink: 0,
                    }}
                  />
                  <Body size={34} align="left" color={theme.colors.text}>
                    {b}
                  </Body>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Content>
    </>
  );
};
