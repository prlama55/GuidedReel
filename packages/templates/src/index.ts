import { TemplateRegistry } from '@guidedreel/engine';
import { blankTemplate } from './templates/blank';
import { modernPromoTemplate } from './templates/modern-promo';
import { productAdTemplate } from './templates/product-ad';
import { socialReelTemplate } from './templates/social-reel';

export * from './templates/blank';
export * from './templates/modern-promo';
export * from './templates/product-ad';
export * from './templates/social-reel';
export * from './helpers';

/** Registry pre-loaded with the built-in templates. Apps may register more. */
export function createTemplateRegistry(): TemplateRegistry {
  return new TemplateRegistry()
    .register(modernPromoTemplate)
    .register(productAdTemplate)
    .register(socialReelTemplate)
    .register(blankTemplate);
}

export const templateRegistry = createTemplateRegistry();
