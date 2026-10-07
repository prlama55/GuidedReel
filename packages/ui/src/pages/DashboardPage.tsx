import { useState } from 'react';
import { Plus, FileUp, ArrowRight } from 'lucide-react';
import { AppShell, RouteLink } from './AppShell';
import { NewProjectDialog } from './NewProjectDialog';
import { ProjectCard } from './ProjectCard';
import { useProjects } from './useProjects';
import { Button, EmptyState, Skeleton } from '../primitives/index';
import { useHost } from '../host/HostContext';

export const DashboardPage: React.FC = () => {
  const { templates } = useHost();
  const { projects, remove, duplicate, exportJson, importJson } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const recent = projects?.slice(0, 4) ?? null;
  const featured = templates
    .list()
    .filter((t) => t.id !== 'blank')
    .slice(0, 3);

  return (
    <AppShell
      title="Dashboard"
      actions={
        <>
          <Button onClick={importJson}>
            <FileUp className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setPreset(undefined);
              setNewOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        </>
      }
    >
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent projects</h2>
          {projects && projects.length > 4 ? (
            <RouteLink
              route={{ name: 'projects' }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              All projects <ArrowRight className="h-3 w-3" />
            </RouteLink>
          ) : null}
        </div>
        {recent === null ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            title="Create your first video"
            description="Pick a format and a template, then write your script. No account needed; projects are stored on this device."
            action={
              <Button variant="primary" onClick={() => setNewOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New project
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {recent.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onDelete={() => remove(p.id)}
                onDuplicate={() => duplicate(p.id)}
                onExport={() => exportJson(p.id)}
              />
            ))}
          </div>
        )}
      </section>
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quick start</h2>
          <RouteLink
            route={{ name: 'templates' }}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            All templates <ArrowRight className="h-3 w-3" />
          </RouteLink>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {featured.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setPreset(t.id);
                setNewOpen(true);
              }}
              className="flex gap-3 rounded-lg border border-border bg-surface p-4 text-left hover:border-border-strong"
            >
              <span
                className="h-12 w-12 shrink-0 rounded-md"
                style={{ background: t.accentColor ?? 'var(--vc-primary)' }}
              />
              <span>
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="mt-0.5 block text-xs text-fg-muted">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <NewProjectDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        presetTemplateId={preset}
      />
    </AppShell>
  );
};
