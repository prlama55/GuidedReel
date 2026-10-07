import type { z } from 'zod';
import type { InspectorField } from './inspector';

export type SceneType =
  'intro' | 'hook' | 'text' | 'image' | 'video' | 'feature' | 'product' | 'quote' | 'cta' | 'outro';

export const SCENE_TYPES: SceneType[] = [
  'intro',
  'hook',
  'text',
  'image',
  'video',
  'feature',
  'product',
  'quote',
  'cta',
  'outro',
];

/**
 * Everything the system needs to know about a scene type without touching React.
 * The editor inspector, templates, importers and (later) AI all validate against this.
 */
export type SceneDefinition<TProps extends Record<string, unknown> = Record<string, unknown>> = {
  type: SceneType;
  label: string;
  description: string;
  /** lucide icon name, resolved by the UI layer. */
  icon: string;
  propsSchema: z.ZodType<TProps>;
  defaultProps: () => TProps;
  /** Default scene length in seconds (converted to frames with the project fps). */
  defaultDurationSeconds: number;
  minDurationSeconds: number;
  inspector: InspectorField[];
  /** Prop keys that hold asset ids, so the engine can track references. */
  assetKeys: (keyof TProps & string)[];
  /** Prop key that holds the primary spoken/displayed text (used by script import + AI). */
  scriptKey?: keyof TProps & string;
  /** Prop key of the primary media asset that supports framing (zoom/pan/crop). */
  mediaKey?: keyof TProps & string;
};

export function defineScene<TProps extends Record<string, unknown>>(
  def: SceneDefinition<TProps>,
): SceneDefinition<TProps> {
  return def;
}
