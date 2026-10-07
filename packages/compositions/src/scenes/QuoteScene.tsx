import { Img, useCurrentFrame, useVideoConfig } from 'remotion';
import type { QuoteProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { Body, Content, Heading } from '../components/Layout';
import { fadeIn, slideIn, staggerIn } from '../animations/index';
import { useAsset, useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';

export const QuoteScene: SceneComponent<QuoteProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const { url: avatar } = useAsset(props.avatarAssetId);
  const motion = useSceneMotion(props, durationInFrames);
  const s = theme.scale;
  const quoteSize = props.quote.length > 160 ? 52 : props.quote.length > 90 ? 62 : 72;

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="gradient"
      />
      <Content style={{ ...motion, gap: 36 * s }}>
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: 220 * s,
            lineHeight: 0.6,
            color: theme.colors.accent,
            opacity: fadeIn(frame, { duration: 12 }) * 0.9,
            height: 120 * s,
          }}
        >
          “
        </div>
        <Heading
          size={quoteSize}
          style={{
            fontWeight: 600,
            fontStyle: 'italic',
            ...slideIn(frame, { start: 6, duration: 22, from: 'up', distance: 50 }),
          }}
        >
          {props.quote}
        </Heading>
        {props.rating ? (
          <div style={{ display: 'flex', gap: 10 * s }}>
            {Array.from({ length: props.rating }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...staggerIn(frame, i, fps, { start: 20, stagger: 3, distance: 16 }),
                  color: theme.colors.accent,
                  fontSize: 44 * s,
                }}
              >
                ★
              </div>
            ))}
          </div>
        ) : null}
        {props.author || avatar ? (
          <div
            style={{
              ...slideIn(frame, { start: 24, duration: 18, from: 'up', distance: 30 }),
              display: 'flex',
              alignItems: 'center',
              gap: 22 * s,
            }}
          >
            {avatar ? (
              <Img
                src={avatar}
                style={{ width: 96 * s, height: 96 * s, borderRadius: 999, objectFit: 'cover' }}
              />
            ) : null}
            <div style={{ textAlign: avatar ? 'left' : 'center' }}>
              {props.author ? (
                <Body
                  size={36}
                  align={avatar ? 'left' : 'center'}
                  color={theme.colors.text}
                  style={{ fontWeight: 700 }}
                >
                  {props.author}
                </Body>
              ) : null}
              {props.role ? (
                <Body size={30} align={avatar ? 'left' : 'center'}>
                  {props.role}
                </Body>
              ) : null}
            </div>
          </div>
        ) : null}
      </Content>
    </>
  );
};
