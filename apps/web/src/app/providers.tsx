'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  HostProvider,
  ToastProvider,
  applyTheme,
  pathToRoute,
  routeToPath,
  webPlatform,
  type EditorHost,
  type Route,
  HttpTtsClient,
} from '@guidedreel/ui';
import {
  IndexedDBAssetStore,
  IndexedDBProjectRepository,
  createStoreAssetResolver,
} from '@guidedreel/storage';
import { templateRegistry } from '@guidedreel/templates';
import { HttpRenderClient } from '@/lib/http-render-client';

/**
 * Wires the shared UI to the browser: IndexedDB persistence, object-URL asset
 * resolution, HTTP render client and Next.js navigation.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const host = useMemo<EditorHost>(() => {
    const assets = new IndexedDBAssetStore();
    const storage = { projects: new IndexedDBProjectRepository(), assets };
    return {
      storage,
      assetResolver: createStoreAssetResolver(assets),
      renderClient: new HttpRenderClient(assets),
      tts: new HttpTtsClient(),
      platform: webPlatform,
      templates: templateRegistry,
      navigate: (route: Route) => router.push(routeToPath(route)),
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
    };
  }, [router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vc:theme');
      applyTheme(raw ? (JSON.parse(raw) as 'system' | 'dark' | 'light') : 'system');
    } catch {
      applyTheme('system');
    }
  }, []);

  return (
    <ToastProvider>
      <HostProvider host={{ ...host, currentRoute: pathToRoute(pathname) }}>
        {children}
      </HostProvider>
    </ToastProvider>
  );
}
