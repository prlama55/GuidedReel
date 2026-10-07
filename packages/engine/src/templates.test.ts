import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TemplateRegistry, type TemplateDefinition } from './templates';
import { createProject } from './project-factory';

function stub(id: string, name = id): TemplateDefinition<Record<string, never>> {
  return {
    meta: {
      id,
      name,
      description: '',
      category: 'other',
      supportedFormats: ['9:16'],
      typicalDurationSeconds: 0,
      tags: [],
      accentColor: '#000000',
    },
    inputSchema: z.object({}),
    sampleInput: () => ({}),
    create: (_input, ctx) => createProject({ ...ctx, templateId: id }),
  };
}

describe('TemplateRegistry', () => {
  it('register rejects duplicate ids', () => {
    const registry = new TemplateRegistry().register(stub('a'));
    expect(() => registry.register(stub('a'))).toThrowError(/already registered/);
  });

  it('registerAll adds many and replaces existing ids', () => {
    const registry = new TemplateRegistry().register(stub('a', 'first'));
    registry.registerAll([stub('a', 'second'), stub('b')]);
    expect(
      registry
        .list()
        .map((m) => m.id)
        .sort(),
    ).toEqual(['a', 'b']);
    expect(registry.require('a').meta.name).toBe('second');
  });
});
