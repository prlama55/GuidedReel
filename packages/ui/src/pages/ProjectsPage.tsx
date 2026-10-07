import { useMemo, useState } from 'react';
import { Plus, FileUp, Search } from 'lucide-react';
import { AppShell } from './AppShell';
import { NewProjectDialog } from './NewProjectDialog';
import { ProjectCard } from './ProjectCard';
import { useProjects } from './useProjects';
import { Button, ConfirmDialog, EmptyState, Input, Skeleton } from '../primitives/index';

export const ProjectsPage: React.FC = () => {
  const { projects, remove, duplicate, exportJson, importJson } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const filtered = useMemo(
    () => (projects ?? []).filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [projects, query],
  );
  const victim = projects?.find((p) => p.id === toDelete);

  return (
    <AppShell
      title="Projects"
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-fg-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="w-56 pl-8"
            />
          </div>
          <Button onClick={importJson}>
            <FileUp className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        </>
      }
    >
      {projects === null ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No projects match your search' : 'No projects yet'}
          description={
            query ? undefined : 'Create a project from a template or import a project.json file.'
          }
          action={
            !query ? (
              <Button variant="primary" onClick={() => setNewOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={() => setToDelete(p.id)}
              onDuplicate={() => duplicate(p.id)}
              onExport={() => exportJson(p.id)}
            />
          ))}
        </div>
      )}
      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
        title="Delete project?"
        danger
        confirmLabel="Delete"
        message={
          <>
            “{victim?.name}” and its scenes will be permanently deleted. Assets stay in your
            library.
          </>
        }
      />
    </AppShell>
  );
};
