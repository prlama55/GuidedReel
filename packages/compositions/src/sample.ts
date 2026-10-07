import type { VideoProject } from '@guidedreel/schema';
import { createProject, createScene } from '@guidedreel/engine';

/** Small project used as Remotion Studio default props and in tests. */
export function createSampleProject(): VideoProject {
  const fps = 30;
  return createProject({
    id: 'sample',
    name: 'Sample project',
    templateId: 'modern-promo',
    aspectRatio: '9:16',
    scenes: [
      createScene('hook', fps, {
        id: 'hook',
        props: { text: 'Too much news, no time to read?', highlightWords: ['news'] },
      }),
      createScene('intro', fps, {
        id: 'intro',
        props: { title: 'Meet Ajako Taja', subtitle: 'Trending stories in seconds' },
        transitionIn: { type: 'zoom', durationInFrames: 14 },
      }),
      createScene('feature', fps, {
        id: 'f1',
        props: {
          badge: '01',
          title: 'Read in 30 seconds',
          description: 'Every story condensed to what matters.',
        },
        transitionIn: { type: 'slide-left', durationInFrames: 12 },
      }),
      createScene('quote', fps, {
        id: 'q',
        props: {
          quote: 'I finally keep up with the news.',
          author: 'Sita R.',
          role: 'Early user',
          rating: 5,
        },
        transitionIn: { type: 'fade', durationInFrames: 12 },
      }),
      createScene('cta', fps, {
        id: 'cta',
        props: { headline: 'Download today', buttonText: 'Get the app', url: 'ajakotaja.com' },
        transitionIn: { type: 'wipe', durationInFrames: 14 },
      }),
      createScene('outro', fps, {
        id: 'outro',
        props: { text: 'Stay informed.', handles: ['@ajakotaja'] },
        transitionIn: { type: 'fade', durationInFrames: 12 },
      }),
    ],
  });
}
