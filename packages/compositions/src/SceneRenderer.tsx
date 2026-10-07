import { createElement } from 'react';
import { AbsoluteFill } from 'remotion';
import type { VideoScene } from '@guidedreel/schema';
import { getSceneDefinition, isSceneType } from '@guidedreel/schema';
import { getSceneComponent } from './scenes/registry';
import { Overlays } from './components/Overlays';

export type SceneRendererProps = { scene: VideoScene; durationInFrames: number };

/** Looks up the component for a scene type and renders it with parsed props. */
export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, durationInFrames }) => {
  if (!isSceneType(scene.type)) {
    return (
      <AbsoluteFill
        style={{
          background: '#000',
          color: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        Unknown scene type: {scene.type}
      </AbsoluteFill>
    );
  }
  const def = getSceneDefinition(scene.type);
  // Defaults are applied here so older documents with missing optional props still render.
  const parsed = def.propsSchema.safeParse(scene.props);
  const props = parsed.success ? parsed.data : def.defaultProps();
  return (
    <AbsoluteFill>
      {createElement(getSceneComponent(scene.type), { scene, props, durationInFrames })}
      <Overlays overlays={scene.overlays ?? []} sceneDurationInFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
