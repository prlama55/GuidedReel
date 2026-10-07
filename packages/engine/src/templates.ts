import type { z } from 'zod';
import type { AspectRatio, TemplateMeta, VideoFormat, VideoProject } from '@guidedreel/schema';
import { VideoCreatorError } from './errors';

export type TemplateContext = {
  format: VideoFormat;
  aspectRatio: AspectRatio;
  name: string;
  projectId?: string;
};

/**
 * A template is a parameterized project factory. Templates support several
 * aspect ratios; they are never duplicated per platform.
 */
export type TemplateDefinition<TInput = unknown> = {
  meta: TemplateMeta;
  inputSchema: z.ZodType<TInput>;
  /** Fully populated sample input so "Use template" produces a real video immediately. */
  sampleInput: () => TInput;
  create: (input: TInput, ctx: TemplateContext) => VideoProject;
};

export class TemplateRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private templates = new Map<string, TemplateDefinition<any>>();

  register<TInput>(template: TemplateDefinition<TInput>): this {
    if (this.templates.has(template.meta.id)) {
      throw new Error(`Template "${template.meta.id}" is already registered`);
    }
    this.templates.set(template.meta.id, template);
    return this;
  }

  /**
   * Registers several templates at once. An id that is already registered is replaced, so
   * app start-up code can run again under hot module reloading without throwing.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerAll(templates: ReadonlyArray<TemplateDefinition<any>>): this {
    for (const template of templates) this.templates.set(template.meta.id, template);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(id: string): TemplateDefinition<any> | undefined {
    return this.templates.get(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  require(id: string): TemplateDefinition<any> {
    const t = this.templates.get(id);
    if (!t)
      throw new VideoCreatorError('NOT_FOUND', `Template "${id}" is not registered`, {
        details: { id },
      });
    return t;
  }

  list(): TemplateMeta[] {
    return [...this.templates.values()].map((t) => t.meta);
  }

  listForFormat(aspectRatio: AspectRatio): TemplateMeta[] {
    return this.list().filter((m) => m.supportedFormats.includes(aspectRatio));
  }

  /** Validates input and builds the project. */
  instantiate(id: string, input: unknown, ctx: TemplateContext): VideoProject {
    const template = this.require(id);
    if (!template.meta.supportedFormats.includes(ctx.aspectRatio)) {
      throw new VideoCreatorError(
        'INVALID_FORMAT',
        `Template "${template.meta.name}" does not support ${ctx.aspectRatio}`,
        {
          details: { supported: template.meta.supportedFormats },
        },
      );
    }
    const parsed = template.inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new VideoCreatorError('VALIDATION_FAILED', 'Template input is invalid', {
        details: { issues: parsed.error.issues },
      });
    }
    return template.create(parsed.data, ctx);
  }
}
