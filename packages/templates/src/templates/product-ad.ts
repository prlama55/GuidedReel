import { z } from 'zod';
import type { TemplateDefinition } from '@guidedreel/engine';
import { buildProject, type SceneSpec } from '../helpers';

export const ProductAdInputSchema = z.object({
  productName: z.string().min(1).max(100),
  tagline: z.string().max(160).optional(),
  price: z.string().max(30).optional(),
  hook: z.string().min(1).max(200),
  bullets: z.array(z.string().max(80)).min(1).max(5),
  features: z
    .array(
      z.object({ title: z.string().min(1).max(100), description: z.string().max(300).optional() }),
    )
    .max(3)
    .default([]),
  testimonial: z
    .object({ quote: z.string().min(1).max(400), author: z.string().max(80).optional() })
    .optional(),
  cta: z.object({
    headline: z.string().min(1).max(120),
    buttonText: z.string().max(40).optional(),
    url: z.string().max(120).optional(),
  }),
});
export type ProductAdInput = z.infer<typeof ProductAdInputSchema>;

export const productAdTemplate: TemplateDefinition<ProductAdInput> = {
  meta: {
    id: 'product-ad',
    name: 'Product Advertisement',
    description:
      'Showcase one product: hook, hero shot with price and bullets, feature close-ups, social proof and a buy CTA.',
    category: 'advertisement',
    supportedFormats: ['9:16', '16:9', '1:1', '4:5'],
    typicalDurationSeconds: 25,
    tags: ['product', 'ecommerce', 'ad'],
    accentColor: '#F59E0B',
  },
  inputSchema: ProductAdInputSchema,
  sampleInput: () => ({
    productName: 'Aero Bottle',
    tagline: 'Cold for 24 hours. Hot for 12.',
    price: '$29',
    hook: 'Your water deserves better.',
    bullets: ['Double-wall steel', 'Leak-proof lid', 'Fits any cup holder'],
    features: [
      {
        title: 'Built to last',
        description: 'Food-grade stainless steel with a lifetime warranty.',
      },
      { title: 'Five colours', description: 'Matte finishes that never chip.' },
    ],
    testimonial: {
      quote: 'The only bottle I have kept for more than a year.',
      author: 'Verified buyer',
    },
    cta: { headline: 'Get yours today', buttonText: 'Shop now', url: 'aerobottle.com' },
  }),
  create: (input, ctx) => {
    const specs: SceneSpec[] = [
      { type: 'hook', props: { text: input.hook, animation: 'pop', size: 'xl' } },
      {
        type: 'product',
        props: {
          name: input.productName,
          tagline: input.tagline ?? '',
          price: input.price ?? '',
          bullets: input.bullets,
        },
        durationSeconds: 6,
        transitionIn: { type: 'zoom', durationInFrames: 14 },
      },
      ...input.features.map<SceneSpec>((f) => ({
        type: 'feature',
        props: { title: f.title, description: f.description ?? '', layout: 'media-left' },
        transitionIn: { type: 'slide-left', durationInFrames: 12 },
      })),
      ...(input.testimonial
        ? [
            {
              type: 'quote',
              props: {
                quote: input.testimonial.quote,
                author: input.testimonial.author ?? '',
                rating: 5,
              },
            } as SceneSpec,
          ]
        : []),
      {
        type: 'cta',
        props: {
          headline: input.cta.headline,
          buttonText: input.cta.buttonText ?? 'Shop now',
          url: input.cta.url ?? '',
          showLogo: true,
        },
        transitionIn: { type: 'slide-up', durationInFrames: 14 },
      },
    ];
    return buildProject(ctx, 'product-ad', specs, {
      defaultTransition: { type: 'fade', durationInFrames: 10 },
    });
  },
};
