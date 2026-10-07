// Renders the app icon candidates in docs/branding from SVG to 1024 px PNGs, plus a
// preview sheet of each at 256 / 64 / 32 px on light and dark backgrounds.
//
//   node tooling/branding/render-icons.mjs                 # all icon-*.svg in docs/branding
//   node tooling/branding/render-icons.mjs icon-b-reel-g   # one, by file name
//
// Uses the Playwright Chromium already installed for the web e2e tests.
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '../../docs/branding');
const names =
  process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync(dir)
        .filter((f) => /^icon-.*\.svg$/.test(f))
        .map((f) => f.replace(/\.svg$/, ''));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
for (const n of names) {
  const svg = readFileSync(path.join(dir, `${n}.svg`), 'utf8');
  const data = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({
    path: path.join(dir, `${n}.png`),
    omitBackground: true,
    clip: { x: 0, y: 0, width: 1024, height: 1024 },
  });
  const sizes = [256, 64, 32].map((w) => `<img src="${data}" width="${w}" height="${w}">`).join('');
  await page.setContent(
    `<html><body style="margin:0;display:flex;align-items:center;justify-content:space-around;width:1024px;height:1024px;background:linear-gradient(90deg,#f1f5f9 50%,#0f172a 50%)">
      <div style="display:flex;gap:28px;align-items:center">${sizes}</div>
      <div style="display:flex;gap:28px;align-items:center">${sizes}</div>
    </body></html>`,
  );
  await page.screenshot({ path: path.join(dir, `${n}-preview.png`) });
  process.stdout.write(`rendered ${n}\n`);
}
await browser.close();
