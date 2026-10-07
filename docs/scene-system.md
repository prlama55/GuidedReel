# Scene system

A scene type is defined once, in `packages/schema`, as a `SceneDefinition`:

```ts
defineScene<HookProps>({
  type: 'hook',
  label: 'Hook',
  description: 'Attention-grabbing statement with animated text',
  icon: 'zap',
  propsSchema: HookPropsSchema,          // Zod
  defaultProps: () => ({ text: '…', highlightWords: [], size: 'lg', animation: 'word-by-word' }),
  defaultDurationSeconds: 4,
  minDurationSeconds: 1.5,
  scriptKey: 'text',                      // where imported script text goes
  assetKeys: ['backgroundAssetId'],       // props that reference assets
  inspector: [ { key: 'text', label: 'Text', kind: 'textarea', group: 'Content' }, … ],
});
```

Everything else derives from the definition:

- **Validation**: `VideoProjectSchema` validates each scene's `props` against its type's schema and enforces the minimum duration.
- **Inspector**: `packages/ui` renders fields from `inspector` metadata; no per-scene form code exists. Field kinds: `text`, `textarea`, `number` (slider optional), `color`, `select`, `toggle`, `asset` (filtered by asset types), `font`, `alignment`, `list`.
- **Script panel and importers** write to `scriptKey`.
- **Asset tracking** (`sceneAssetIds`, usage counts, dangling-reference checks) reads `assetKeys`.
- **Type changes** keep props that the new type also accepts.

## Components

`packages/compositions/src/scenes/*Scene.tsx` implement `SceneComponent<TProps>` and receive `{ scene, props, durationInFrames }`. They read theme, assets and timeline from `useComposition()` / `useTheme()` / `useAsset()` and never fetch anything.

Rules for scene components:

- Size everything with `theme.scale` (1 at a 1080 px short side) so a scene looks the same in 9:16, 16:9, 1:1 and 4:5. Use `useIsLandscape()` to pick side-by-side layouts.
- Use the shared `Background`, `Media`, `BrandLogo`, `Placeholder`, `Content`, `Heading`, `Body`, `Pill` building blocks.
- Use the animation helpers (`fadeIn`, `slideIn`, `scaleIn`, `pop`, `kenBurns`, `typewriter`, `wordReveal`, `staggerIn`, `blurIn`, `exitFrames`). They are pure functions of the frame.
- Missing media renders a `Placeholder`; it never throws.
- Media always fits its slot. The shared `Media` component takes the slot size (`box`) and a `fit` of `auto | cover | contain`. In `auto` (the default) the media covers the slot when its aspect ratio is within about 20% of the slot's, and otherwise is shown whole over a blurred, darkened copy of itself, so a landscape photo in a 9:16 video never gets cropped and never shows black bars. The decision is `resolveFit()` in `components/fit.ts`; it relies on the asset's `width`/`height` captured at import time and falls back to `contain` when they are unknown. On top of the fit, `mediaZoom` (1–4) and `mediaOffsetX`/`mediaOffsetY` (−1..1, fractions of half the slot) frame the media; `mediaSlotSize()` in `components/slots.ts` is the single source of truth for slot dimensions and is shared with the editor's crop mode. Scene definitions declare the framed prop via `mediaKey`.

V1 scenes: intro, hook, text, image, video, feature, product, quote, cta, outro. Planned: testimonial, statistics, comparison, list, news, chart, logo, custom.

## Transitions

`TransitionConfig { type, durationInFrames }` is stored on the incoming scene as `transitionIn`. `resolveTransition` maps it to `@remotion/transitions` presentations (`fade`, `slide`, `wipe`) plus a custom `zoom` presentation. The exact overlap used by the timeline is passed through so the series and the timeline never disagree.

## Overlays

Every scene has an `overlays` array of free-positioned elements drawn on top of it, in z-order:

- `text`: text with size, weight, alignment, colour, optional background pill and font.
- `media`: an image, GIF, logo or video asset with fit, corner radius, shadow and mute. GIF files render frame-accurately through `@remotion/gif`.
- `emoji`: a sticker from Google's Noto Emoji set (`codepoint`, `animated`, `playbackRate`). Animated stickers stream the GIF from fonts.gstatic.com; static ones use the SVG. The catalogue (`STICKERS` in `@guidedreel/engine`, ~600 emoji without skin-tone variants) is generated from the official Noto Emoji Animation API.

Both share `x`/`y` (centre, fractions of the frame), `width` (fraction of frame width; media also has `height`), `rotation`, `opacity`, `startOffsetFrames`, optional `durationInFrames`, an enter `animation` and a `locked` flag. Because positions are fractions, the same overlay lands in the same place in 9:16, 16:9 and 1:1. `components/Overlays.tsx` renders them inside the scene's `TransitionSeries.Sequence`, so scene transitions apply to overlays too. Engine helpers: `addOverlay`, `updateOverlay`, `removeOverlay`, `duplicateOverlay`, `reorderOverlay`; `sceneAssetIds` includes overlay media so missing assets are detected and `removeAsset` drops overlays that used the asset.

The built-in scene layouts (titles, feature media, product cards) stay template-driven so they keep adapting to each format; overlays are the freeform layer on top.

## Animation catalogue

Defined once in `packages/schema/src/animation.ts`, implemented in `packages/compositions/src/animations/presets.ts`:

| Kind         | Presets                                                                                                                 | Used by                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Enter        | none, fade, slide-up/down/left/right, zoom-in, zoom-out, pop, bounce, drop, flip, rotate, blur, wipe, typewriter (text) | overlays, Text and Hook scenes (Hook also keeps word-by-word), whole-scene entrance override on every other scene |
| Exit         | none, fade, slide-up/down/left/right, zoom-in, zoom-out, pop, blur, wipe, spin                                          | overlays, every scene                                                                                             |
| Loop         | none, pulse, float, wiggle, spin, blink, swing, heartbeat, shake                                                        | overlays (starts after the entrance)                                                                              |
| Image motion | none, ken-burns, zoom-in, zoom-out, pan-left/right/up/down, drift                                                       | Image scene                                                                                                       |
| Transitions  | none, fade, slide-left/right/up/down, zoom, wipe (left/right/up/down), flip, clock-wipe, iris                           | between scenes                                                                                                    |

`animateElement()` composes enter, exit and loop into one style (opacities multiply, transforms compose). Overlays carry `enterDurationFrames` and `exitDurationFrames`; scenes use a fixed entrance length and an exit over the last third of the scene (at most 12 frames). Every scene's `animation` defaults to `default`, which keeps the scene's own choreography; choosing a preset animates the whole content block in addition.

Schema version 2 replaced the Image scene's `kenBurns` toggle with `motion`; `migrateProjectDocument` upgrades v1 files automatically.
