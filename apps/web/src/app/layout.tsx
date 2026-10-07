import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

const description =
  'Script-to-video creator for Reels, Shorts, TikTok and ads. Write a script, pick a template, add your media, export an MP4.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'),
  title: { default: 'GuidedReel', template: '%s · GuidedReel' },
  description,
  applicationName: 'GuidedReel',
  authors: [{ name: 'Padma Raj Lama', url: 'https://github.com/prlama55' }],
  keywords: ['video editor', 'script to video', 'reels', 'shorts', 'tiktok', 'remotion'],
  // opengraph-image.png and twitter-image.png next to this file are picked up automatically.
  openGraph: { type: 'website', siteName: 'GuidedReel', title: 'GuidedReel', description },
  twitter: { card: 'summary_large_image', title: 'GuidedReel', description },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0e14' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
