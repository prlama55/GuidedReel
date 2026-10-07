import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { OutroProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { BrandLogo } from '../components/BrandLogo';
import { Body, Content, Heading } from '../components/Layout';
import { scaleIn, slideIn, staggerIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const OutroScene: SceneComponent<OutroProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);
  const s = theme.scale;

  return (
    <>
      <Background assetId={props.backgroundAssetId} color={props.backgroundColor} variant="solid" />
      <Content style={{ ...motion, gap: 36 * s }}>
        {props.showLogo ? (
          <div style={{ transform: `scale(${scaleIn(frame, fps, { from: 0.7 })})` }}>
            <BrandLogo size={170} />
          </div>
        ) : null}
        {props.text ? (
          <Heading
            size={64}
            style={{
              fontWeight: 700,
              ...slideIn(frame, { start: 8, duration: 20, from: 'up', distance: 40 }),
            }}
          >
            {props.text}
          </Heading>
        ) : null}
        {props.handles.length > 0 ? (
          <div style={{ display: 'flex', gap: 28 * s, flexWrap: 'wrap', justifyContent: 'center' }}>
            {props.handles.map((h, i) => (
              <Body
                key={i}
                size={34}
                color={theme.colors.accent}
                style={{
                  ...staggerIn(frame, i, fps, { start: 18, stagger: 5, distance: 20 }),
                  fontWeight: 700,
                }}
              >
                {h}
              </Body>
            ))}
          </div>
        ) : null}
      </Content>
    </>
  );
};
