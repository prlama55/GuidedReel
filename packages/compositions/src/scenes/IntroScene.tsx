import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { IntroProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { BrandLogo } from '../components/BrandLogo';
import { Body, Content, Heading } from '../components/Layout';
import { fadeIn, scaleIn, slideIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const IntroScene: SceneComponent<IntroProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="radial"
      />
      <Content style={{ ...motion, gap: 36 * theme.scale }}>
        {props.showLogo ? (
          <div
            style={{
              transform: `scale(${scaleIn(frame, fps, { from: 0.6 })})`,
              opacity: fadeIn(frame, { duration: 10 }),
            }}
          >
            <BrandLogo assetId={props.logoAssetId} size={150} />
          </div>
        ) : null}
        <Heading style={slideIn(frame, { start: 6, duration: 22, from: 'up', distance: 70 })}>
          {props.title}
        </Heading>
        {props.subtitle ? (
          <Body style={slideIn(frame, { start: 16, duration: 22, from: 'up', distance: 50 })}>
            {props.subtitle}
          </Body>
        ) : null}
      </Content>
    </>
  );
};
