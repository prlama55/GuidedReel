// Renders the web icon set and social sharing images from docs/branding/guidedreel-mark.svg:
//
//   apps/web/src/app/apple-icon.png          180 px, iOS home screen
//   apps/web/public/icons/icon-192.png        PWA manifest
//   apps/web/public/icons/icon-512.png        PWA manifest
//   apps/web/public/icons/icon-maskable-512.png  PWA maskable (mark inside the safe zone)
//   apps/web/src/app/opengraph-image.png     1200×630, Open Graph (Next.js file convention)
//   apps/web/src/app/twitter-image.png       same artwork for Twitter / X cards
//   docs/branding/social-preview.png         1280×640, GitHub repository social preview
//
//   node tooling/branding/render-web-assets.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const mark = readFileSync(path.join(root, 'docs/branding/guidedreel-mark.svg'), 'utf8');
const data = `data:image/svg+xml;utf8,${encodeURIComponent(mark)}`;
const app = path.join(root, 'apps/web/src/app');
const icons = path.join(root, 'apps/web/public/icons');
mkdirSync(icons, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });

async function shot(width, height, html, file) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<html><body style="margin:0;width:${width}px;height:${height}px;overflow:hidden">${html}</body></html>`,
  );
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } });
  process.stdout.write(`rendered ${path.relative(root, file)}\n`);
}

const plain = (size) =>
  `<img src="${data}" width="${size}" height="${size}" style="display:block">`;
await shot(180, 180, plain(180), path.join(app, 'apple-icon.png'));
await shot(192, 192, plain(192), path.join(icons, 'icon-192.png'));
await shot(512, 512, plain(512), path.join(icons, 'icon-512.png'));
// Maskable: full-bleed gradient with the mark scaled into the 80% safe zone.
await shot(
  512,
  512,
  `<div style="width:512px;height:512px;background:linear-gradient(135deg,#6366F1,#EC4899);display:flex;align-items:center;justify-content:center">
     <img src="${data}" width="400" height="400" style="display:block;border-radius:88px">
   </div>`,
  path.join(icons, 'icon-maskable-512.png'),
);

const social = (w, h) => `
  <div style="position:relative;width:${w}px;height:${h}px;background:#0B0F19;font-family:-apple-system,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#fff;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(900px 500px at 15% 20%,rgba(99,102,241,.45),transparent 60%),radial-gradient(800px 500px at 90% 90%,rgba(236,72,153,.4),transparent 60%)"></div>
    <div style="position:absolute;left:${Math.round(w * 0.07)}px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:${Math.round(w * 0.04)}px">
      <img src="${data}" width="${Math.round(h * 0.42)}" height="${Math.round(h * 0.42)}" style="display:block;box-shadow:0 24px 60px rgba(0,0,0,.45);border-radius:${Math.round(h * 0.09)}px">
      <div>
        <div style="font-size:${Math.round(h * 0.17)}px;font-weight:800;letter-spacing:-0.02em;line-height:1">GuidedReel</div>
        <div style="margin-top:${Math.round(h * 0.035)}px;font-size:${Math.round(h * 0.062)}px;font-weight:500;color:#C7D2FE;max-width:${Math.round(w * 0.55)}px;line-height:1.3">Script to video for Reels, Shorts, TikTok and ads. Web and desktop, open source.</div>
        <div style="margin-top:${Math.round(h * 0.05)}px;font-size:${Math.round(h * 0.045)}px;color:#94A3B8">Developed by Padma Raj Lama · github.com/prlama55/GuidedReel</div>
      </div>
    </div>
  </div>`;
await shot(1200, 630, social(1200, 630), path.join(app, 'opengraph-image.png'));
copyFileSync(path.join(app, 'opengraph-image.png'), path.join(app, 'twitter-image.png'));
await shot(1280, 640, social(1280, 640), path.join(root, 'docs/branding/social-preview.png'));
await browser.close();
