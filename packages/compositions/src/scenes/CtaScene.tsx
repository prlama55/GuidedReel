import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { CtaProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { BrandLogo } from '../components/BrandLogo';
import { Body, Content, Heading } from '../components/Layout';
import { fadeIn, pop, slideIn } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const CtaScene: SceneComponent<CtaProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);
  const s = theme.scale;
  const ctaStyle = theme.brand?.ctaStyle ?? 'solid';
  const buttonScale = pop(frame, fps, 14);
  // Gentle pulse after the button lands.
  const pulse = frame > 40 ? 1 + 0.02 * Math.sin((frame - 40) / 6) : 1;

  const button: React.CSSProperties = {
    transform: `scale(${buttonScale * pulse})`,
    opacity: buttonScale,
    padding: `${26 * s}px ${64 * s}px`,
    borderRadius: ctaStyle === 'pill' ? 999 : 20 * s,
    background: ctaStyle === 'outline' ? 'transparent' : theme.colors.primary,
    border: ctaStyle === 'outline' ? `${4 * s}px solid ${theme.colors.primary}` : 'none',
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontWeight: 800,
    fontSize: 44 * s,
    boxShadow: ctaStyle === 'outline' ? 'none' : `0 ${20 * s}px ${60 * s}px rgba(0,0,0,0.35)`,
  };

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="radial"
      />
      <Content style={{ ...motion, gap: 40 * s }}>
        {props.showLogo ? (
          <div style={{ opacity: fadeIn(frame, { duration: 12 }) }}>
            <BrandLogo size={110} />
          </div>
        ) : null}
        <Heading
          size={84}
          style={slideIn(frame, { start: 4, duration: 20, from: 'up', distance: 60 })}
        >
          {props.headline}
        </Heading>
        {props.subline ? (
          <Body
            size={40}
            style={slideIn(frame, { start: 10, duration: 20, from: 'up', distance: 40 })}
          >
            {props.subline}
          </Body>
        ) : null}
        {props.buttonText ? <div style={button}>{props.buttonText}</div> : null}
        {props.url ? (
          <Body
            size={34}
            color={theme.colors.accent}
            style={{
              ...slideIn(frame, { start: 22, duration: 16, from: 'up', distance: 20 }),
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {props.url}
          </Body>
        ) : null}
      </Content>
    </>
  );
};
