import { z } from 'zod';
import type { TemplateDefinition } from '@guidedreel/engine';
import { buildProject, type SceneSpec } from '../helpers';

export const ModernPromoInputSchema = z.object({
  brandName: z.string().min(1).max(60),
  hook: z.string().min(1).max(200),
  highlightWords: z.array(z.string()).default([]),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  features: z
    .array(
      z.object({ title: z.string().min(1).max(100), description: z.string().max(300).optional() }),
    )
    .min(1)
    .max(4),
  quote: z
    .object({
      quote: z.string().min(1).max(400),
      author: z.string().max(80).optional(),
      role: z.string().max(80).optional(),
    })
    .optional(),
  cta: z.object({
    headline: z.string().min(1).max(120),
    buttonText: z.string().max(40).optional(),
    url: z.string().max(120).optional(),
  }),
  outroText: z.string().max(120).optional(),
});
export type ModernPromoInput = z.infer<typeof ModernPromoInputSchema>;

export const modernPromoTemplate: TemplateDefinition<ModernPromoInput> = {
  meta: {
    id: 'modern-promo',
    name: 'Modern Promotional',
    description:
      'Hook, intro, feature highlights, optional testimonial and a call to action. Clean, bold and brand-driven.',
    category: 'promotional',
    supportedFormats: ['9:16', '16:9', '1:1', '4:5'],
    typicalDurationSeconds: 30,
    tags: ['promo', 'launch', 'brand'],
    accentColor: '#6366F1',
  },
  inputSchema: ModernPromoInputSchema,
  sampleInput: () => ({
    brandName: 'Ajako Taja',
    hook: 'Too much news, no time to read?',
    highlightWords: ['news', 'time'],
    title: 'Meet Ajako Taja',
    subtitle: 'Trending stories, summarised in seconds',
    features: [
      {
        title: 'Trending now',
        description: 'The stories everyone is talking about, updated every hour.',
      },
      { title: 'Read in 30 seconds', description: 'Every story condensed to what matters.' },
      { title: 'In your language', description: 'Nepali and English, side by side.' },
    ],
    quote: {
      quote: 'I finally keep up with the news without losing my mornings.',
      author: 'Sita R.',
      role: 'Early user',
    },
    cta: { headline: 'Download Ajako Taja today', buttonText: 'Get the app', url: 'ajakotaja.com' },
    outroText: 'Stay informed. Stay quick.',
  }),
  create: (input, ctx) => {
    const specs: SceneSpec[] = [
      {
        type: 'hook',
        props: {
          text: input.hook,
          highlightWords: input.highlightWords,
          animation: 'word-by-word',
        },
      },
      {
        type: 'intro',
        props: { title: input.title, subtitle: input.subtitle ?? '', showLogo: true },
        transitionIn: { type: 'zoom', durationInFrames: 14 },
      },
      ...input.features.map<SceneSpec>((f, i) => ({
        type: 'feature',
        title: `Feature ${i + 1}`,
        props: {
          title: f.title,
          description: f.description ?? '',
          layout: 'media-top',
          badge: `0${i + 1}`,
        },
        transitionIn: { type: i % 2 === 0 ? 'slide-left' : 'slide-up', durationInFrames: 12 },
      })),
      ...(input.quote
        ? [
            {
              type: 'quote',
              props: {
                quote: input.quote.quote,
                author: input.quote.author ?? '',
                role: input.quote.role ?? '',
                rating: 5,
              },
            } as SceneSpec,
          ]
        : []),
      {
        type: 'cta',
        props: {
          headline: input.cta.headline,
          buttonText: input.cta.buttonText ?? 'Learn more',
          url: input.cta.url ?? '',
          showLogo: true,
        },
        transitionIn: { type: 'wipe', durationInFrames: 14 },
      },
      {
        type: 'outro',
        props: { text: input.outroText ?? input.brandName, showLogo: true, handles: [] },
      },
    ];
    return buildProject(ctx, 'modern-promo', specs, {
      defaultTransition: { type: 'fade', durationInFrames: 12 },
    });
  },
};
