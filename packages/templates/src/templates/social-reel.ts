import { z } from 'zod';
import type { TemplateDefinition } from '@guidedreel/engine';
import { buildProject, type SceneSpec } from '../helpers';

export const SocialReelInputSchema = z.object({
  hook: z.string().min(1).max(200),
  highlightWords: z.array(z.string()).default([]),
  points: z.array(z.string().min(1).max(300)).min(1).max(6),
  cta: z.object({ headline: z.string().min(1).max(120), subline: z.string().max(160).optional() }),
  handle: z.string().max(60).optional(),
});
export type SocialReelInput = z.infer<typeof SocialReelInputSchema>;

/**
 * Fast-paced text-first reel. Works as an Instagram Reel, YouTube Short,
 * TikTok or Story in 9:16, and as a feed post in 1:1 / 4:5.
 */
export const socialReelTemplate: TemplateDefinition<SocialReelInput> = {
  meta: {
    id: 'social-reel',
    name: 'Social Reel',
    description:
      'Punchy hook, quick text beats and a follow CTA. Made for Reels, Shorts, TikTok and Stories.',
    category: 'social',
    supportedFormats: ['9:16', '1:1', '4:5'],
    typicalDurationSeconds: 18,
    tags: ['reel', 'short', 'tiktok', 'story'],
    accentColor: '#EC4899',
  },
  inputSchema: SocialReelInputSchema,
  sampleInput: () => ({
    hook: '3 things nobody tells you about starting a business',
    highlightWords: ['nobody', 'business'],
    points: [
      '1. Your first idea is rarely the one that works.',
      '2. Cash flow matters more than revenue.',
      '3. Talk to customers before you build.',
    ],
    cta: { headline: 'Follow for more', subline: 'New tips every week' },
    handle: '@yourbrand',
  }),
  create: (input, ctx) => {
    const specs: SceneSpec[] = [
      {
        type: 'hook',
        props: {
          text: input.hook,
          highlightWords: input.highlightWords,
          animation: 'word-by-word',
          size: 'xl',
        },
        durationSeconds: 3.5,
      },
      ...input.points.map<SceneSpec>((p, i) => ({
        type: 'text',
        title: `Beat ${i + 1}`,
        props: { text: p, size: 'lg', align: 'left', animation: 'slide-up' },
        durationSeconds: 3,
        transitionIn: { type: i % 2 === 0 ? 'slide-up' : 'slide-left', durationInFrames: 8 },
      })),
      {
        type: 'cta',
        props: {
          headline: input.cta.headline,
          subline: input.cta.subline ?? '',
          buttonText: input.handle ?? '',
          url: '',
          showLogo: true,
        },
        durationSeconds: 3,
        transitionIn: { type: 'zoom', durationInFrames: 10 },
      },
    ];
    return buildProject(ctx, 'social-reel', specs, {
      defaultTransition: { type: 'slide-up', durationInFrames: 8 },
    });
  },
};
