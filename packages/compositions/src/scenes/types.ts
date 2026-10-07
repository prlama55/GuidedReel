import type { VideoScene } from '@guidedreel/schema';

export type SceneComponentProps<TProps> = {
  scene: VideoScene;
  props: TProps;
  /** Effective length of this scene in frames (after audio-driven duration). */
  durationInFrames: number;
};

export type SceneComponent<TProps> = React.FC<SceneComponentProps<TProps>>;
