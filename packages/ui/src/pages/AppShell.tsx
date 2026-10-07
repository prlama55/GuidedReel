import {
  Clapperboard,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  ListVideo,
  Settings,
} from 'lucide-react';
import { useHost } from '../host/HostContext';
import { routeToPath, type Route } from '../host/types';
import { cn } from '../lib/cn';
import { BrandMark } from '../primitives/BrandMark';

const NAV: { route: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { route: { name: 'dashboard' }, label: 'Dashboard', icon: LayoutDashboard },
  { route: { name: 'projects' }, label: 'Projects', icon: Clapperboard },
  { route: { name: 'templates' }, label: 'Templates', icon: LayoutTemplate },
  { route: { name: 'assets' }, label: 'Assets', icon: FolderOpen },
  { route: { name: 'renders' }, label: 'Render queue', icon: ListVideo },
  { route: { name: 'settings' }, label: 'Settings', icon: Settings },
];

export const RouteLink: React.FC<{
  route: Route;
  className?: string;
  children: React.ReactNode;
  title?: string;
}> = ({ route, className, children, title }) => {
  const { navigate } = useHost();
  return (
    <a
      href={routeToPath(route)}
      title={title}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.button !== 0) return;
        e.preventDefault();
        navigate(route);
      }}
    >
      {children}
    </a>
  );
};

/** Sidebar layout for the non-editor pages. */
export const AppShell: React.FC<{
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}> = ({ children, title, actions }) => {
  const { currentRoute, appVersion, platform } = useHost();
  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div
          className={cn(
            'flex items-center gap-2 px-4 pt-4 pb-3',
            platform.name === 'desktop' && 'pt-10',
          )}
        >
          <BrandMark />
          <span className="text-sm font-semibold">GuidedReel</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
          {NAV.map(({ route, label, icon: Icon }) => {
            const active = currentRoute?.name === route.name;
            return (
              <RouteLink
                key={route.name}
                route={route}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm',
                  active
                    ? 'bg-surface-3 font-medium text-fg'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </RouteLink>
            );
          })}
        </nav>
        <div className="mt-auto px-4 py-3 text-[10px] text-fg-subtle">
          {platform.name === 'desktop' ? 'Desktop' : 'Web'}
          {appVersion ? ` · v${appVersion}` : ''}
          {' · by Padma Raj Lama'}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {title ? (
          <header
            data-vc-titlebar
            className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 sm:px-8"
          >
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">{actions}</div>
          </header>
        ) : null}
        <div className="flex-1 px-6 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
};
