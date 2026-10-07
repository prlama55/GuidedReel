import type { MetadataRoute } from 'next';

/** Web app manifest so the editor can be installed from the browser. Icons come from tooling/branding. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GuidedReel',
    short_name: 'GuidedReel',
    description: 'Script-to-video creator for Reels, Shorts, TikTok and ads.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0e14',
    theme_color: '#0b0e14',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
