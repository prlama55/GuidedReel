import type { SceneType } from '@guidedreel/schema';
import type { SceneComponent } from './types';
import { IntroScene } from './IntroScene';
import { HookScene } from './HookScene';
import { TextScene } from './TextScene';
import { ImageScene } from './ImageScene';
import { VideoScene } from './VideoScene';
import { FeatureScene } from './FeatureScene';
import { ProductScene } from './ProductScene';
import { QuoteScene } from './QuoteScene';
import { CtaScene } from './CtaScene';
import { OutroScene } from './OutroScene';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SCENE_COMPONENTS: Record<SceneType, SceneComponent<any>> = {
  intro: IntroScene,
  hook: HookScene,
  text: TextScene,
  image: ImageScene,
  video: VideoScene,
  feature: FeatureScene,
  product: ProductScene,
  quote: QuoteScene,
  cta: CtaScene,
  outro: OutroScene,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSceneComponent(type: SceneType): SceneComponent<any> {
  const c = SCENE_COMPONENTS[type];
  if (!c) throw new Error(`No component registered for scene type "${type}"`);
  return c;
}

export * from './types';
export {
  IntroScene,
  HookScene,
  TextScene,
  ImageScene,
  VideoScene,
  FeatureScene,
  ProductScene,
  QuoteScene,
  CtaScene,
  OutroScene,
};
