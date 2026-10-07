import type { AssetResolver, TemplateRegistry } from '@guidedreel/engine';
import type { StorageContext } from '@guidedreel/storage';
import type { PlatformAdapter } from '../platform/types';
import type { RenderClient } from '../render/client';
import type { TtsClient } from '../tts/client';

export type Route =
  | { name: 'dashboard' }
  | { name: 'projects' }
  | { name: 'templates' }
  | { name: 'assets' }
  | { name: 'renders' }
  | { name: 'settings' }
  | { name: 'editor'; projectId: string };

export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return '/';
    case 'editor':
      return `/editor/${encodeURIComponent(route.projectId)}`;
    default:
      return `/${route.name}`;
  }
}

export function pathToRoute(path: string): Route {
  const clean = path.split('?')[0]?.replace(/\/+$/, '') || '/';
  if (clean === '/') return { name: 'dashboard' };
  const editor = /^\/editor\/([^/]+)$/.exec(clean);
  if (editor?.[1]) return { name: 'editor', projectId: decodeURIComponent(editor[1]) };
  const name = clean.slice(1);
  if (
    name === 'projects' ||
    name === 'templates' ||
    name === 'assets' ||
    name === 'renders' ||
    name === 'settings'
  )
    return { name };
  return { name: 'dashboard' };
}

/** Everything the host app injects into the shared UI. */
export type EditorHost = {
  storage: StorageContext;
  assetResolver: AssetResolver;
  renderClient: RenderClient;
  /** Text-to-speech; omit to hide voiceover generation. */
  tts?: TtsClient;
  platform: PlatformAdapter;
  templates: TemplateRegistry;
  navigate: (route: Route) => void;
  /** Optional: current route, for nav highlighting. */
  currentRoute?: Route;
  appVersion?: string;
};
