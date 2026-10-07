// Renders the example videos shown in the README into docs/examples.
//
//   pnpm --filter @guidedreel/renderer examples            # all four examples
//   pnpm --filter @guidedreel/renderer examples social-reel  # one example by id
//
// Everything is self-contained: the artwork is generated as small SVG files
// next to the outputs, so the examples re-render identically on any machine
// (first run downloads Remotion's headless browser). Each example renders to
// an MP4 at half resolution, then to a looping GIF and a poster frame with the
// ffmpeg that ships with Remotion.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  FORMAT_PRESETS,
  type Asset,
  type AspectRatio,
  type VideoProject,
} from '@guidedreel/schema';
import { createProject, createScene } from '@guidedreel/engine';
import { templateRegistry } from '@guidedreel/templates';
import { LocalRemotionRenderer } from '../src/local-renderer';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, '../../..');
const outDir = path.join(repoRoot, 'docs/examples');
const assetDir = path.join(outDir, 'assets');

// ---------------------------------------------------------------------------
// Artwork: flat illustrations as SVG (a few KB each) standing in for photos.
// ---------------------------------------------------------------------------

type Art = { id: string; file: string; svg: string; type?: Asset['type'] };

const gradient = (id: string, a: string, b: string, angle = 135) =>
  `<linearGradient id="${id}" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

const frame = (w: number, h: number, defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

const ART: Art[] = [
  {
    id: 'logo',
    file: 'logo.svg',
    type: 'logo',
    svg: frame(
      512,
      512,
      gradient('g', '#6366F1', '#EC4899'),
      `<rect width="512" height="512" rx="120" fill="url(#g)"/>
       <path d="M150 160h60l46 130 46-130h60l-78 200h-56z" fill="#fff"/>
       <circle cx="396" cy="130" r="26" fill="#FDE68A"/>`,
    ),
  },
  {
    id: 'news',
    file: 'news.svg',
    svg: frame(
      1080,
      1350,
      gradient('g', '#1E1B4B', '#4338CA'),
      `<rect width="1080" height="1350" fill="url(#g)"/>
       <rect x="240" y="180" width="600" height="990" rx="70" fill="#0B0F19" stroke="#A5B4FC" stroke-width="10"/>
       <rect x="300" y="300" width="480" height="120" rx="24" fill="#6366F1"/>
       <rect x="300" y="460" width="480" height="28" rx="14" fill="#C7D2FE"/>
       <rect x="300" y="520" width="380" height="28" rx="14" fill="#C7D2FE" opacity=".7"/>
       <rect x="300" y="620" width="480" height="120" rx="24" fill="#EC4899"/>
       <rect x="300" y="780" width="480" height="28" rx="14" fill="#FBCFE8"/>
       <rect x="300" y="840" width="300" height="28" rx="14" fill="#FBCFE8" opacity=".7"/>
       <rect x="300" y="940" width="480" height="120" rx="24" fill="#F59E0B"/>`,
    ),
  },
  {
    id: 'clock',
    file: 'clock.svg',
    svg: frame(
      1080,
      1350,
      gradient('g', '#312E81', '#DB2777'),
      `<rect width="1080" height="1350" fill="url(#g)"/>
       <circle cx="540" cy="675" r="340" fill="#0B0F19" stroke="#fff" stroke-width="18"/>
       <circle cx="540" cy="675" r="24" fill="#F59E0B"/>
       <path d="M540 675V420" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
       <path d="M540 675l170 110" stroke="#EC4899" stroke-width="26" stroke-linecap="round"/>
       <text x="540" y="1140" font-family="Helvetica, Arial, sans-serif" font-size="110" font-weight="800" fill="#fff" text-anchor="middle">30 s</text>`,
    ),
  },
  {
    id: 'languages',
    file: 'languages.svg',
    svg: frame(
      1080,
      1350,
      gradient('g', '#0F766E', '#6366F1'),
      `<rect width="1080" height="1350" fill="url(#g)"/>
       <rect x="140" y="330" width="560" height="260" rx="60" fill="#fff"/>
       <text x="420" y="500" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="800" fill="#0F766E" text-anchor="middle">नेपाली</text>
       <rect x="380" y="720" width="560" height="260" rx="60" fill="#0B0F19"/>
       <text x="660" y="890" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="800" fill="#fff" text-anchor="middle">English</text>`,
    ),
  },
  {
    id: 'bottle',
    file: 'bottle.svg',
    svg: frame(
      1080,
      1350,
      gradient('g', '#ECFEFF', '#A5F3FC', 90) + gradient('b', '#0E7490', '#164E63', 90),
      `<rect width="1080" height="1350" fill="url(#g)"/>
       <ellipse cx="540" cy="1180" rx="300" ry="40" fill="#0E7490" opacity=".25"/>
       <rect x="400" y="260" width="280" height="880" rx="110" fill="url(#b)"/>
       <rect x="440" y="150" width="200" height="160" rx="40" fill="#164E63"/>
       <rect x="470" y="420" width="140" height="420" rx="70" fill="#fff" opacity=".18"/>
       <text x="540" y="1010" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="800" fill="#fff" text-anchor="middle" opacity=".9">AERO</text>`,
    ),
  },
  {
    id: 'steel',
    file: 'steel.svg',
    svg: frame(
      1080,
      1350,
      gradient('g', '#111827', '#374151'),
      `<rect width="1080" height="1350" fill="url(#g)"/>
       ${[0, 1, 2, 3, 4].map((i) => `<rect x="${120 + i * 180}" y="300" width="120" height="750" rx="60" fill="#9CA3AF" opacity="${0.35 + i * 0.13}"/>`).join('')}
       <circle cx="540" cy="675" r="200" fill="none" stroke="#22D3EE" stroke-width="22"/>`,
    ),
  },
  {
    id: 'colours',
    file: 'colours.svg',
    svg: frame(
      1080,
      1350,
      '',
      `<rect width="1080" height="1350" fill="#F8FAFC"/>
       ${['#0E7490', '#DB2777', '#F59E0B', '#16A34A', '#6366F1'].map((c, i) => `<rect x="${110 + i * 180}" y="${380 + (i % 2) * 90}" width="140" height="600" rx="70" fill="${c}"/>`).join('')}`,
    ),
  },
  {
    id: 'mountains',
    file: 'mountains.svg',
    svg: frame(
      1350,
      1080,
      gradient('sky', '#FDE68A', '#F472B6', 90),
      `<rect width="1350" height="1080" fill="url(#sky)"/>
       <circle cx="1000" cy="300" r="120" fill="#FFF7ED"/>
       <path d="M0 820L300 420l220 260 180-360 260 420 200-240 190 320v260H0z" fill="#4C1D95"/>
       <path d="M0 900l260-220 240 180 300-300 300 280 250-160v300H0z" fill="#1E1B4B"/>`,
    ),
  },
  {
    id: 'city',
    file: 'city.svg',
    svg: frame(
      1350,
      1080,
      gradient('sky', '#0F172A', '#1D4ED8', 90),
      `<rect width="1350" height="1080" fill="url(#sky)"/>
       ${[60, 220, 360, 540, 700, 860, 1020, 1180].map((x, i) => `<rect x="${x}" y="${300 + ((i * 97) % 300)}" width="${110 + (i % 3) * 30}" height="800" fill="#020617"/>`).join('')}
       ${Array.from({ length: 40 }, (_, i) => `<rect x="${80 + ((i * 131) % 1200)}" y="${360 + ((i * 71) % 600)}" width="18" height="26" fill="#FDE68A" opacity="${0.5 + (i % 3) * 0.2}"/>`).join('')}`,
    ),
  },
  {
    id: 'coffee',
    file: 'coffee.svg',
    svg: frame(
      1350,
      1080,
      gradient('g', '#78350F', '#F59E0B'),
      `<rect width="1350" height="1080" fill="url(#g)"/>
       <ellipse cx="675" cy="560" rx="330" ry="300" fill="#FFF7ED"/>
       <ellipse cx="675" cy="560" rx="270" ry="240" fill="#451A03"/>
       <path d="M1000 460q160 20 150 150t-170 110" fill="none" stroke="#FFF7ED" stroke-width="60" stroke-linecap="round"/>
       <path d="M560 300q-40-80 10-150M680 290q-40-80 10-150M800 300q-40-80 10-150" fill="none" stroke="#FFF7ED" stroke-width="22" stroke-linecap="round" opacity=".8"/>`,
    ),
  },
];

function asset(art: Art): Asset {
  return {
    id: art.id,
    type: art.type ?? 'image',
    name: art.file,
    source: { kind: 'local', path: path.join(assetDir, art.file) },
    mimeType: 'image/svg+xml',
  };
}

// ---------------------------------------------------------------------------
// Example projects
// ---------------------------------------------------------------------------

type Example = {
  id: string;
  title: string;
  aspect: AspectRatio;
  gifWidth: number;
  /** Time of the poster frame, chosen to show media rather than the opening hook. */
  posterSeconds: number;
  build: () => VideoProject;
};

const ctx = (aspect: AspectRatio, name: string) => ({
  format: FORMAT_PRESETS[aspect].format,
  aspectRatio: aspect,
  name,
  projectId: name.toLowerCase().replace(/\W+/g, '-'),
});

/** Keeps every example around 12–15 s so the GIFs stay small. */
function shorten(project: VideoProject, factor: number): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => ({
      ...s,
      durationInFrames: Math.max(45, Math.round(s.durationInFrames * factor)),
    })),
  };
}

const EXAMPLES: Example[] = [
  {
    id: 'modern-promo',
    title: 'Modern Promotional · 9:16',
    aspect: '9:16',
    gifWidth: 270,
    posterSeconds: 4,
    build: () => {
      const t = templateRegistry.require('modern-promo');
      const p = templateRegistry.instantiate(
        'modern-promo',
        t.sampleInput(),
        ctx('9:16', 'Ajako Taja promo'),
      );
      const media = ['news', 'clock', 'languages'];
      let i = 0;
      return shorten(
        {
          ...p,
          brand: {
            name: 'Ajako Taja',
            logoAssetId: 'logo',
            colors: {
              primary: '#6366F1',
              secondary: '#EC4899',
              accent: '#F59E0B',
              background: '#0B0F19',
              text: '#FFFFFF',
            },
            fonts: [],
            ctaStyle: 'pill',
          },
          assets: ['logo', ...media].map((id) => asset(ART.find((a) => a.id === id)!)),
          scenes: p.scenes.map((s) =>
            s.type === 'feature'
              ? { ...s, props: { ...s.props, mediaAssetId: media[i++ % media.length] } }
              : s,
          ),
        },
        0.5,
      );
    },
  },
  {
    id: 'product-ad',
    title: 'Product Advertisement · 16:9',
    aspect: '16:9',
    gifWidth: 480,
    posterSeconds: 4,
    build: () => {
      const t = templateRegistry.require('product-ad');
      const p = templateRegistry.instantiate(
        'product-ad',
        t.sampleInput(),
        ctx('16:9', 'Aero Bottle ad'),
      );
      const media = ['steel', 'colours'];
      let i = 0;
      return shorten(
        {
          ...p,
          brand: {
            name: 'Aero',
            colors: {
              primary: '#0E7490',
              secondary: '#22D3EE',
              accent: '#F59E0B',
              background: '#082F49',
              text: '#FFFFFF',
            },
            fonts: [],
            ctaStyle: 'solid',
          },
          assets: ['bottle', ...media].map((id) => asset(ART.find((a) => a.id === id)!)),
          scenes: p.scenes.map((s) =>
            s.type === 'product'
              ? { ...s, props: { ...s.props, imageAssetId: 'bottle' } }
              : s.type === 'feature'
                ? { ...s, props: { ...s.props, mediaAssetId: media[i++ % media.length] } }
                : s,
          ),
        },
        0.55,
      );
    },
  },
  {
    id: 'social-reel',
    title: 'Social Reel · 1:1',
    aspect: '1:1',
    gifWidth: 320,
    posterSeconds: 7,
    build: () => {
      const t = templateRegistry.require('social-reel');
      const p = templateRegistry.instantiate(
        'social-reel',
        t.sampleInput(),
        ctx('1:1', 'Business tips reel'),
      );
      return shorten(
        {
          ...p,
          brand: {
            name: 'Founder Notes',
            colors: {
              primary: '#F59E0B',
              secondary: '#EF4444',
              accent: '#FDE68A',
              background: '#1C1917',
              text: '#FFFFFF',
            },
            fonts: [],
            ctaStyle: 'outline',
          },
        },
        0.6,
      );
    },
  },
  {
    id: 'photo-story',
    title: 'Photo story with overlays · 4:5',
    aspect: '4:5',
    gifWidth: 300,
    posterSeconds: 4,
    build: () => {
      const fps = 30;
      const photo = (
        id: string,
        motion: string,
        caption: string,
        overlayText: string,
        transition: VideoProject['scenes'][number]['transitionIn'],
      ) =>
        createScene('image', fps, {
          durationSeconds: 3.2,
          props: { imageAssetId: id, motion, caption },
          transitionIn: transition,
        });
      const scenes = [
        createScene('hook', fps, {
          durationSeconds: 2.6,
          props: {
            text: 'One weekend. Three cities.',
            highlightWords: ['Three'],
            animation: 'word-by-word',
          },
        }),
        photo('mountains', 'ken-burns', 'Saturday, 6 am', 'Chase the sunrise', {
          type: 'flip',
          durationInFrames: 14,
        }),
        photo('city', 'pan-right', 'Saturday, 9 pm', 'Lights on', {
          type: 'clock-wipe',
          durationInFrames: 14,
        }),
        photo('coffee', 'zoom-out', 'Sunday, slow', 'Recharge', {
          type: 'iris',
          durationInFrames: 14,
        }),
        createScene('cta', fps, {
          durationSeconds: 2.8,
          props: { headline: 'Plan yours', buttonText: 'Open the app', url: 'weekend.travel' },
          transitionIn: { type: 'slide-up', durationInFrames: 12 },
        }),
      ];
      // Text overlays positioned in frame fractions; stickers come from Noto Emoji.
      const texts = ['Chase the sunrise', 'Lights on', 'Recharge'];
      const emojis = ['1f305', '1f30c', '2615'];
      scenes.forEach((s, i) => {
        if (s.type !== 'image') return;
        const k = i - 1;
        s.overlays = [
          {
            id: `t${k}`,
            kind: 'text',
            text: texts[k]!,
            x: 0.5,
            y: 0.18,
            width: 0.8,
            rotation: 0,
            opacity: 1,
            fontSize: 72,
            weight: 800,
            align: 'center',
            background: '#0B0F19',
            color: '#FFFFFF',
            animation: k % 2 ? 'slide-left' : 'slide-up',
            exitAnimation: 'fade',
            loopAnimation: 'none',
            enterDurationFrames: 14,
            exitDurationFrames: 10,
            startOffsetFrames: 6,
            locked: false,
          },
          {
            id: `e${k}`,
            kind: 'emoji',
            codepoint: emojis[k]!,
            x: 0.82,
            y: 0.84,
            width: 0.16,
            rotation: 0,
            opacity: 1,
            animated: true,
            playbackRate: 1,
            animation: 'fade',
            exitAnimation: 'none',
            loopAnimation: 'float',
            enterDurationFrames: 12,
            exitDurationFrames: 12,
            startOffsetFrames: 12,
            locked: false,
          },
        ];
      });
      return createProject({
        id: 'photo-story',
        name: 'Weekend photo story',
        templateId: 'blank',
        aspectRatio: '4:5',
        scenes,
        assets: ['mountains', 'city', 'coffee'].map((id) => asset(ART.find((a) => a.id === id)!)),
        brand: {
          name: 'Weekend',
          colors: {
            primary: '#F472B6',
            secondary: '#FDE68A',
            accent: '#4C1D95',
            background: '#1E1B4B',
            text: '#FFFFFF',
          },
          fonts: [],
          ctaStyle: 'pill',
        },
      });
    },
  },
];

// ---------------------------------------------------------------------------
// ffmpeg from the Remotion compositor package (needs its dylibs on the path).
// ---------------------------------------------------------------------------

function compositorDir(): string {
  const map: Record<string, string> = {
    'darwin-arm64': 'darwin-arm64',
    'darwin-x64': 'darwin-x64',
    'linux-x64': 'linux-x64-gnu',
    'linux-arm64': 'linux-arm64-gnu',
    'win32-x64': 'win32-x64-msvc',
  };
  const key = `${process.platform}-${process.arch}`;
  const pkg = map[key];
  if (!pkg) throw new Error(`No Remotion compositor for ${key}`);
  return path.dirname(require.resolve(`@remotion/compositor-${pkg}/package.json`));
}

function ffmpeg(args: string[]): Promise<void> {
  const dir = compositorDir();
  const bin = path.join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  const env = {
    ...process.env,
    DYLD_LIBRARY_PATH: dir,
    LD_LIBRARY_PATH: dir,
  };
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['-y', '-loglevel', 'error', ...args], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)),
    );
  });
}

// ---------------------------------------------------------------------------

async function main() {
  const only = process.argv.slice(2);
  await mkdir(assetDir, { recursive: true });
  for (const art of ART) await writeFile(path.join(assetDir, art.file), art.svg, 'utf8');

  const renderer = new LocalRemotionRenderer({
    outputDir: outDir,
    bundleDir: path.join(os.tmpdir(), 'guidedreel', 'examples-bundle'),
  });

  for (const ex of EXAMPLES) {
    if (only.length && !only.includes(ex.id)) continue;
    const project = ex.build();
    process.stdout.write(`\n▶ ${ex.title}\n`);
    const result = await renderer.render(
      project,
      { codec: 'h264', quality: 'standard', scale: 0.5, muted: true, fileName: ex.id },
      {
        onProgress: (p) => {
          if (p.status === 'rendering' && p.renderedFrames !== undefined)
            process.stdout.write(`\r  rendering ${p.renderedFrames}/${p.totalFrames} frames`);
        },
      },
    );
    const mp4 = result.outputPath!;
    const gif = path.join(outDir, `${ex.id}.gif`);
    const poster = path.join(outDir, `${ex.id}.jpg`);
    process.stdout.write('\n  encoding gif…');
    // Remotion's ffmpeg build has no `fps` filter, so the GIF rate is set as an output option.
    await ffmpeg([
      '-i',
      mp4,
      '-filter_complex',
      `scale=${ex.gifWidth}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      '-r',
      '12',
      '-loop',
      '0',
      gif,
    ]);
    await ffmpeg([
      '-ss',
      String(ex.posterSeconds),
      '-i',
      mp4,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      poster,
    ]);
    const size = async (f: string) => `${((await stat(f)).size / 1024 / 1024).toFixed(1)} MB`;
    process.stdout.write(
      `\n  ✓ ${path.relative(repoRoot, mp4)} (${await size(mp4)}), ${path.basename(gif)} (${await size(gif)}), ${path.basename(poster)}\n`,
    );
  }
}

await main();
