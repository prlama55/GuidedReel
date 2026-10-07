import type { SceneDefinition, SceneType } from './definition';
import { introScene } from './intro';
import { hookScene } from './hook';
import { textScene } from './text';
import { imageScene } from './image';
import { videoScene } from './video';
import { featureScene } from './feature';
import { productScene } from './product';
import { quoteScene } from './quote';
import { ctaScene } from './cta';
import { outroScene } from './outro';

export * from './definition';
export * from './inspector';
export * from './common';
export * from './intro';
export * from './hook';
export * from './text';
export * from './image';
export * from './video';
export * from './feature';
export * from './product';
export * from './quote';
export * from './cta';
export * from './outro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySceneDefinition = SceneDefinition<any>;

export const SCENE_DEFINITIONS: Record<SceneType, AnySceneDefinition> = {
  intro: introScene,
  hook: hookScene,
  text: textScene,
  image: imageScene,
  video: videoScene,
  feature: featureScene,
  product: productScene,
  quote: quoteScene,
  cta: ctaScene,
  outro: outroScene,
};

export const SCENE_DEFINITION_LIST: AnySceneDefinition[] = Object.values(SCENE_DEFINITIONS);

export function getSceneDefinition(type: SceneType): AnySceneDefinition {
  const def = SCENE_DEFINITIONS[type];
  if (!def) throw new Error(`Unknown scene type: ${type}`);
  return def;
}

export function isSceneType(value: unknown): value is SceneType {
  return typeof value === 'string' && value in SCENE_DEFINITIONS;
}
