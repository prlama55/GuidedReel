import { z } from 'zod';
import type { TemplateDefinition } from '@guidedreel/engine';
import { buildProject } from '../helpers';

const InputSchema = z.object({});

export const blankTemplate: TemplateDefinition<z.infer<typeof InputSchema>> = {
  meta: {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch and add your own scenes.',
    category: 'other',
    supportedFormats: ['9:16', '16:9', '1:1', '4:5'],
    typicalDurationSeconds: 0,
    tags: [],
    accentColor: '#64748B',
  },
  inputSchema: InputSchema,
  sampleInput: () => ({}),
  create: (_input, ctx) => buildProject(ctx, 'blank', []),
};
