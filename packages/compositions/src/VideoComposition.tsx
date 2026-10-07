import { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries } from '@remotion/transitions';
import type { VideoProject } from '@guidedreel/schema';
import { calculateTimeline } from '@guidedreel/engine';
import { CompositionContext, type AssetUrlMap } from './context';
import { createTheme } from './theme';
import { resolveTransition } from './transitions/index';
import { SceneRenderer } from './SceneRenderer';
import { AudioTracks } from './AudioTracks';
import { Watermark } from './components/Watermark';
import { useProjectFonts } from './fonts';

export type VideoCompositionProps = {
  project: VideoProject;
  /** assetId → URL the current environment can load. */
  assetUrls: AssetUrlMap;
};

/**
 * The single Remotion composition. Everything about the video comes from the
 * project document; the component has no knowledge of where it runs.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({ project, assetUrls }) => {
  const timeline = useMemo(() => calculateTimeline(project), [project]);
  const theme = useMemo(() => createTheme(project), [project]);
  useProjectFonts(project, assetUrls);

  const sceneById = useMemo(() => new Map(project.scenes.map((s) => [s.id, s])), [project.scenes]);

  // TransitionSeries requires a flat list of Sequence / Transition children.
  const children: React.ReactNode[] = [];
  timeline.sceneOrder.forEach((item, index) => {
    const scene = sceneById.get(item.refId);
    if (!scene) return;
    if (index > 0 && item.transitionIn) {
      const t = resolveTransition(item.transitionIn, item.transitionFrames, project.format);
      if (t) {
        children.push(
          <TransitionSeries.Transition
            key={`t-${scene.id}`}
            presentation={t.presentation}
            timing={t.timing}
          />,
        );
      }
    }
    children.push(
      <TransitionSeries.Sequence
        key={`s-${scene.id}`}
        durationInFrames={item.durationInFrames}
        name={scene.title ?? scene.type}
      >
        <SceneRenderer scene={scene} durationInFrames={item.durationInFrames} />
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <CompositionContext.Provider value={{ project, assetUrls, theme, timeline }}>
      <AbsoluteFill
        style={{ backgroundColor: project.settings.backgroundColor, fontFamily: theme.fonts.body }}
      >
        {children.length > 0 ? <TransitionSeries>{children}</TransitionSeries> : null}
        <AudioTracks />
        <Watermark />
      </AbsoluteFill>
    </CompositionContext.Provider>
  );
};
