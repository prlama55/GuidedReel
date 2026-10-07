import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import { AbsoluteFill, interpolate } from 'remotion';

export type ZoomPresentationProps = { amount?: number };

const ZoomPresentation: React.FC<TransitionPresentationComponentProps<ZoomPresentationProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const amount = passedProps.amount ?? 0.2;
  const isEntering = presentationDirection === 'entering';
  const scale = isEntering
    ? interpolate(presentationProgress, [0, 1], [1 + amount, 1])
    : interpolate(presentationProgress, [0, 1], [1, 1 - amount / 2]);
  const opacity = isEntering ? presentationProgress : 1 - presentationProgress;
  return <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>{children}</AbsoluteFill>;
};

export function zoomPresentation(
  props: ZoomPresentationProps = {},
): TransitionPresentation<ZoomPresentationProps> {
  return { component: ZoomPresentation, props };
}
