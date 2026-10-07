import type { Route } from './host/types';
import { EditorPage } from './editor/EditorPage';
import { ErrorBoundary } from './primitives/ErrorBoundary';
import {
  DashboardPage,
  ProjectsPage,
  TemplatesPage,
  AssetsPage,
  RendersPage,
  SettingsPage,
} from './pages/index';

/** Maps a Route to a page. Hosts wire this into their router (Next.js pages or an in-memory router in Electron). */
export const AppRouter: React.FC<{ route: Route }> = ({ route }) => (
  <ErrorBoundary resetKey={JSON.stringify(route)}>
    <RoutePage route={route} />
  </ErrorBoundary>
);

const RoutePage: React.FC<{ route: Route }> = ({ route }) => {
  switch (route.name) {
    case 'editor':
      return <EditorPage projectId={route.projectId} />;
    case 'projects':
      return <ProjectsPage />;
    case 'templates':
      return <TemplatesPage />;
    case 'assets':
      return <AssetsPage />;
    case 'renders':
      return <RendersPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};
