# Example videos

Four short videos rendered by the app itself, one per format. They are what the README shows, and they double as a smoke test of the whole pipeline: template → project → Remotion composition → MP4 → GIF.

| Example                              | Format | Template                    | Shows                                                                                       |
| ------------------------------------ | ------ | --------------------------- | ------------------------------------------------------------------------------------------- |
| [modern-promo.mp4](modern-promo.mp4) | 9:16   | Modern Promotional          | Word-by-word hook, intro with logo, features with media, quote, pill call to action, outro  |
| [product-ad.mp4](product-ad.mp4)     | 16:9   | Product Advertisement       | Product card with price and bullets, side-by-side features, testimonial                     |
| [social-reel.mp4](social-reel.mp4)   | 1:1    | Social Reel                 | Numbered points, brand initials, outline call to action with handle                         |
| [photo-story.mp4](photo-story.mp4)   | 4:5    | Blank, built scene by scene | Image scenes with Ken Burns and pans, text overlays, animated stickers, flip / clock / iris |

Each example has a `.gif` for embedding and a `.jpg` poster. The MP4s are rendered at half resolution with the Standard quality preset and no audio, so they stay under 1 MB each.

## Regenerate

```bash
pnpm --filter @guidedreel/renderer examples                 # all four
pnpm --filter @guidedreel/renderer examples photo-story     # one, by id
```

The script is `packages/renderer/scripts/render-examples.ts`. It writes the small SVG artwork in `assets/` first, so the examples need no external media and render identically on any machine. The first run downloads Remotion's headless browser. GIFs are encoded with the ffmpeg bundled with Remotion, at 12 frames per second with a 128-colour palette.

The animated stickers in the photo story are Noto Emoji fetched from fonts.gstatic.com at render time, so that example needs network access.
