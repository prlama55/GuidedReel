# Branding

GuidedReel's icon is **Guided play**: a dotted guide track that leads into a play triangle, standing for "script in, video out", on the indigo-to-pink gradient the default brand kit uses in videos.

| File                                   | Use                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon-a-guided-play.svg` / `.png`      | The app icon (1024 px, macOS-style margin and shadow). Copied to `apps/desktop/build/icon.png`, from which electron-builder derives `.icns` and `.ico`. |
| `guidedreel-mark.svg`                  | Full-bleed mark without margin or shadow. Used as the web favicon (`apps/web/src/app/icon.svg`) and the sidebar logo.                                   |
| `icon-b-reel-g.svg`, `icon-c-reel.svg` | Alternative candidates kept for reference.                                                                                                              |
| `*-preview.png`                        | Each candidate at 256, 64 and 32 px on light and dark backgrounds.                                                                                      |
| `social-preview.png`                   | 1280×640 image for the GitHub repository's social preview (Settings → Social preview).                                                                  |

Regenerate the PNGs after editing an SVG:

```bash
node tooling/branding/render-icons.mjs        # desktop icon candidates and previews
node tooling/branding/render-web-assets.mjs   # web favicon set, PWA icons, Open Graph and social images
```

Web assets produced from `guidedreel-mark.svg`: `apps/web/src/app/icon.svg` (favicon), `apple-icon.png` (iOS home screen), `opengraph-image.png` and `twitter-image.png` (link previews, picked up by the Next.js file convention), and `apps/web/public/icons/*` for the web app manifest in `apps/web/src/app/manifest.ts`.

To switch icons, copy another candidate's PNG over `apps/desktop/build/icon.png` and rebuild the desktop app.
