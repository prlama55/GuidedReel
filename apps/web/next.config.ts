import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Shared packages are consumed from TypeScript source.
  transpilePackages: [
    '@guidedreel/ui',
    '@guidedreel/compositions',
    '@guidedreel/engine',
    '@guidedreel/schema',
    '@guidedreel/storage',
    '@guidedreel/templates',
    '@guidedreel/renderer',
  ],
  // Remotion's renderer spawns native binaries; keep it out of the server bundle.
  serverExternalPackages: [
    '@remotion/renderer',
    '@remotion/bundler',
    '@remotion/compositor-darwin-arm64',
    '@remotion/compositor-darwin-x64',
    '@remotion/compositor-linux-x64-gnu',
    '@remotion/compositor-linux-arm64-gnu',
    '@remotion/compositor-win32-x64-msvc',
    'esbuild',
    'webpack',
  ],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

export default nextConfig;
