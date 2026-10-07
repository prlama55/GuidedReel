import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { HookProps } from '@guidedreel/schema';
import { Background } from '../components/Background';
import { Content, Heading, TEXT_SIZES } from '../components/Layout';
import { isHighlighted, pop, splitWords, typewriter, wordReveal } from '../animations/index';
import { useTheme } from '../context';
import type { SceneComponent } from './types';
import { useSceneMotion } from '../animations/useSceneMotion';
import { enterPreset, mergeAnim } from '../animations/presets';

export const HookScene: SceneComponent<HookProps> = ({ props, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const size = TEXT_SIZES[props.size];
  const motion = useSceneMotion(props, durationInFrames);
  const words = splitWords(props.text);

  let content: React.ReactNode;
  if (props.animation === 'typewriter') {
    const shown = typewriter(props.text, frame, {
      start: 4,
      charsPerFrame: Math.max(0.6, props.text.length / Math.max(1, durationInFrames * 0.6)),
    });
    content = (
      <Heading size={size}>
        {shown}
        <span
          style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: theme.colors.accent }}
        >
          |
        </span>
      </Heading>
    );
  } else if (props.animation === 'pop') {
    const s = pop(frame, fps, 2);
    content = (
      <Heading size={size} style={{ transform: `scale(${0.7 + 0.3 * s})`, opacity: s }}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color: isHighlighted(w, props.highlightWords) ? theme.colors.accent : undefined,
            }}
          >
            {w}{' '}
          </span>
        ))}
      </Heading>
    );
  } else if (props.animation !== 'word-by-word') {
    content = (
      <Heading size={size} style={mergeAnim(enterPreset(props.animation, frame, fps, 18, 80))}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color: isHighlighted(w, props.highlightWords) ? theme.colors.accent : undefined,
            }}
          >
            {w}{' '}
          </span>
        ))}
      </Heading>
    );
  } else {
    content = (
      <Heading size={size}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              ...wordReveal(frame, i, fps, {
                start: 3,
                stagger: Math.max(2, Math.min(5, Math.floor(40 / words.length))),
              }),
              color: isHighlighted(w, props.highlightWords) ? theme.colors.accent : undefined,
              marginRight: '0.28em',
            }}
          >
            {w}
          </span>
        ))}
      </Heading>
    );
  }

  return (
    <>
      <Background
        assetId={props.backgroundAssetId}
        color={props.backgroundColor}
        variant="gradient"
      />
      <Content style={{ ...motion }}>{content}</Content>
    </>
  );
};
