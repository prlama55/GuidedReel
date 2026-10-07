'use client';

import dynamic from 'next/dynamic';
import type { Route } from '@guidedreel/core/ui';

// The editor uses IndexedDB and the Remotion Player, which only exist in the browser.
const AppRouter = dynamic(() => import('@guidedreel/core/ui').then((m) => m.AppRouter), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-fg-muted">Loading…</div>
  ),
});

export function ClientApp({ route }: { route: Route }) {
  return <AppRouter route={route} />;
}
