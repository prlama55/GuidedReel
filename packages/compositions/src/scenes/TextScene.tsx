import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { TextProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { Content, Heading, TEXT_SIZES } from '../components/Layout';
import { typewriter } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';
import { enterPreset, mergeAnim } from '../animations/presets';

export const TextScene: SceneComponent<TextProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const motion = useSceneMotion(props, durationInFrames);
  const size = TEXT_SIZES[props.size] * 0.85;
  const align = props.align;
  const alignItems = align === 'left' ? 'start' : align === 'right' ? 'end' : 'center';

  const { fps } = useVideoConfig();
  const anim: React.CSSProperties = mergeAnim(enterPreset(props.animation, frame, fps, 18, 80));
  const text =
    props.animation === 'typewriter'
      ? typewriter(props.text, frame, {
          start: 2,
          charsPerFrame: Math.max(0.8, props.text.length / Math.max(1, durationInFrames * 0.65)),
        })
      : props.text;

  return (
    <>
      <Background assetId={props.backgroundAssetId} color={props.backgroundColor} variant="solid" />
      <Content align={alignItems} style={{ ...motion }}>
        <div
          style={{
            ...anim,
            borderLeft:
              align === 'left' ? `${8 * theme.scale}px solid ${theme.colors.accent}` : undefined,
            paddingLeft: align === 'left' ? 36 * theme.scale : 0,
          }}
        >
          <Heading size={size} align={align} style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>
            {text}
          </Heading>
        </div>
      </Content>
    </>
  );
};
