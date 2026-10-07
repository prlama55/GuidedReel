import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import { COMPOSITION_ID, computeCompositionMetadata } from './metadata';
import { createSampleProject } from './sample';

const sample = createSampleProject();
const sampleMeta = computeCompositionMetadata(sample);

/** Remotion root: one composition whose size and length come from the project props. */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={VideoComposition}
      defaultProps={{ project: sample, assetUrls: {} }}
      durationInFrames={sampleMeta.durationInFrames}
      fps={sampleMeta.fps}
      width={sampleMeta.width}
      height={sampleMeta.height}
      calculateMetadata={({ props }) => computeCompositionMetadata(props.project)}
    />
  );
};
