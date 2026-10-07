---
name: scenes-and-templates
description: Use when adding or changing a scene type, template, transition, animation or inspector field in GuidedReel — scene definitions (propsSchema/defaults/inspector metadata in packages/schema), React scene components (packages/compositions), icons (packages/ui), TemplateDefinition/buildProject/TemplateRegistry (packages/templates, engine), or templates registered by apps and create-guidedreel extensions. Triggers — "add a scene", "new template", "inspector field", "SCENE_DEFINITIONS", "registerAll", "buildProject", "SceneSpec", "template category", "every prop has an inspector field".
---

# Scenes and templates

## Scene types (closed set, three registries)

1. **Definition** `packages/schema/src/scenes/<type>.ts`: `propsSchema` (Zod), `defaultProps`, `inspector: InspectorField[]` (kinds: text, textarea, number, color, select, toggle, asset, font, alignment; groups Content/Media/Timing/Transition/Style), asset keys, script key. Register in `scenes/index.ts` (`SCENE_DEFINITIONS`) and add the literal to `SceneType`/`SCENE_TYPES` in `scenes/definition.ts`. `SceneTypeSchema` is `z.enum(SCENE_TYPES)`.
2. **Component** `packages/compositions/src/scenes/<Type>Scene.tsx`, registered in `scenes/registry.ts` (`SCENE_COMPONENTS`). Remotion + React only; inline styles; responsive to `width/height`; animations from `animations/presets`.
3. **Icon** `packages/ui/src/primitives/icons.tsx` (`SCENE_ICONS`) and a colour class in `packages/ui/src/styles.css`.

The inspector, timeline, importers and validation read definitions generically — no per-scene UI code. The schema test fails if a prop lacks an inspector field. Built-in types: hook, intro, text, image, video, feature, product, quote, cta, outro. `startFrame` is never stored; `calculateTimeline` derives it (transitions overlap and shorten total duration).

Scene types cannot be added from an app built on `@guidedreel/core`: components must be in the Remotion bundle that `@guidedreel/renderer` builds from `@guidedreel/compositions/entry`. Add them here and release.

## Templates (open: apps register their own)

- `TemplateDefinition<TInput>` (`packages/engine/src/templates.ts`): `meta` (`id`, `name`, `description`, `category` ∈ `TemplateCategorySchema` — `promotional | advertisement | social | educational | news | event | …`; **not** `promo`), `supportedFormats` (`'9:16' | '16:9' | '1:1' | '4:5'`), `typicalDurationSeconds`, `tags`, `accentColor`), `inputSchema` (Zod), `sampleInput()`, `create(input, ctx)`.
- `buildProject(ctx, templateId, specs, { defaultTransition })` and `SceneSpec = { type } & CreateSceneOptions` (`props`, `title`, `durationSeconds`, `transitionIn`) from `packages/templates/src/helpers.ts`; both re-exported by `@guidedreel/core`.
- Built-ins in `packages/templates/src/templates/` (`modern-promo`, `product-ad`, `social-reel`, `blank`), pre-loaded by `createTemplateRegistry()`; `templateRegistry` is the shared instance.
- `TemplateRegistry.register(t)` throws on duplicate id; `registerAll(ts)` replaces (HMR-safe). Apps/shells call `templateRegistry.registerAll(templates)` at module top level (`apps/web/src/app/providers.tsx`, `apps/desktop/src/renderer/src/App.tsx` in generated thin apps).
- Test pattern (`packages/templates/src/templates.test.ts`, mirrored in generated `packages/extensions/src/templates.test.ts`): instantiate every template with `sampleInput()` in every supported format, `validateProject` must succeed, `calculateTimeline(project).totalFrames > 0`.

## Transitions and animations

`packages/compositions/src/transitions/` wraps `@remotion/transitions` (`resolveTransition`, custom `zoomPresentation`); types none/fade/slide-*/zoom/wipe live in `TransitionConfig` (schema). Animation presets in `compositions/src/animations/presets` (fadeIn, slideIn, scaleIn, kenBurns, typewriter, wordHighlight…). See `docs/scene-system.md`, `docs/template-system.md`.
