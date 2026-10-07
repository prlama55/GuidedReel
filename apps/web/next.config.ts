import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Remotion's renderer spawns native binaries and resolves the compositions bundle entry on
  // disk at runtime, so these stay out of the server bundle and load from node_modules.
  serverExternalPackages: [
    '@guidedreel/renderer',
    '@guidedreel/compositions',
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
