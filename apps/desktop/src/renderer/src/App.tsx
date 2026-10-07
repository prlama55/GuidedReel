import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppRouter,
  HostProvider,
  ToastProvider,
  applyTheme,
  pathToRoute,
  routeToPath,
  redo,
  undo,
  useEditorStore,
  saveNow,
  NewProjectDialog,
  ExportDialog,
  useProjects,
  type EditorHost,
  type Route,
} from '@guidedreel/core/ui';
import { templateRegistry } from '@guidedreel/core';
import type { MenuAction } from '../../shared/ipc';
import {
  DesktopAssetStore,
  DesktopProjectRepository,
  DesktopRenderClient,
  desktopAssetResolver,
  desktopPlatform,
  DesktopTtsClient,
} from './host';

/** Hash-based routing so the app works from file:// in production. */
function useHashRoute(): [Route, (r: Route) => void] {
  const read = () => pathToRoute(window.location.hash.replace(/^#/, '') || '/');
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToPath(r);
  }, []);
  return [route, navigate];
}

export function App() {
  const [route, navigate] = useHashRoute();
  const [version, setVersion] = useState<string | undefined>();
  const [newOpen, setNewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const host = useMemo<EditorHost>(() => {
    const assets = new DesktopAssetStore();
    return {
      storage: { projects: new DesktopProjectRepository(), assets },
      assetResolver: desktopAssetResolver,
      renderClient: new DesktopRenderClient(),
      tts: new DesktopTtsClient(),
      platform: desktopPlatform,
      templates: templateRegistry,
      navigate,
    };
  }, [navigate]);

  useEffect(() => {
    void window.vc.app.getInfo().then((i) => setVersion(i.version));
    try {
      const raw = localStorage.getItem('vc:theme');
      applyTheme(raw ? (JSON.parse(raw) as 'system' | 'dark' | 'light') : 'system');
    } catch {
      applyTheme('system');
    }
  }, []);

  return (
    <ToastProvider>
      <HostProvider host={{ ...host, currentRoute: route, appVersion: version }}>
        <AppRouter route={route} />
        <MenuBridge
          onNewProject={() => setNewOpen(true)}
          onExportVideo={() => setExportOpen(true)}
          navigate={navigate}
          route={route}
        />
        <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
        {route.name === 'editor' ? (
          <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
        ) : null}
      </HostProvider>
    </ToastProvider>
  );
}

/** Translates native menu actions into UI actions. */
const MenuBridge: React.FC<{
  onNewProject: () => void;
  onExportVideo: () => void;
  navigate: (r: Route) => void;
  route: Route;
}> = ({ onNewProject, onExportVideo, navigate, route }) => {
  const { importJson, exportJson } = useProjects();
  useEffect(() => {
    return window.vc.app.onMenuAction((action: MenuAction) => {
      const state = useEditorStore.getState();
      switch (action) {
        case 'new-project':
          return onNewProject();
        case 'open-projects':
          return navigate({ name: 'projects' });
        case 'import-project':
          return void importJson().then((p) => p && navigate({ name: 'editor', projectId: p.id }));
        case 'export-project':
          if (state.project) void exportJson(state.project.id);
          return;
        case 'export-video':
          if (route.name === 'editor') onExportVideo();
          return;
        case 'undo':
          return undo();
        case 'redo':
          return redo();
        case 'save':
          return void saveNow((p) => window.vc.projects.save(p));
        case 'settings':
          return navigate({ name: 'settings' });
        case 'shortcuts':
          return;
      }
    });
  }, [onNewProject, onExportVideo, navigate, route, importJson, exportJson]);
  return null;
};
