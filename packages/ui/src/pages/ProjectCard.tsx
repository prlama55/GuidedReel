import { Copy, MoreHorizontal, Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import type { ProjectSummary } from '@guidedreel/storage';
import { aspectRatioOf } from '@guidedreel/schema';
import { formatRelative } from '../lib/format';
import { Badge, Button } from '../primitives/index';
import { RouteLink } from './AppShell';
import { cn } from '../lib/cn';

export const ProjectCard: React.FC<{
  project: ProjectSummary;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}> = ({ project, onDuplicate, onDelete, onExport }) => {
  const [menu, setMenu] = useState(false);
  const ratio = aspectRatioOf(project.format);
  const ar = project.format.width / project.format.height;
  return (
    <div className="group relative rounded-lg border border-border bg-surface transition-colors hover:border-border-strong">
      <RouteLink route={{ name: 'editor', projectId: project.id }} className="block p-3">
        <div className="flex h-36 items-center justify-center rounded-md bg-stage">
          {project.thumbnailUrl ? (
            <img src={project.thumbnailUrl} alt="" className="max-h-full max-w-full rounded-sm" />
          ) : (
            <div
              className="rounded-sm bg-gradient-to-br from-primary/70 to-accent/60"
              style={{ width: ar >= 1 ? 120 : 120 * ar, height: ar >= 1 ? 120 / ar : 120 }}
            />
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{project.name}</div>
            <div className="mt-0.5 text-[11px] text-fg-muted">
              {project.sceneCount} scene{project.sceneCount === 1 ? '' : 's'} · edited{' '}
              {formatRelative(project.updatedAt)}
            </div>
          </div>
          <Badge>{ratio}</Badge>
        </div>
      </RouteLink>
      {(onDuplicate || onDelete || onExport) && (
        <div className="absolute right-2 top-2">
          <Button
            size="icon"
            variant="secondary"
            className={cn('opacity-0 group-hover:opacity-100', menu && 'opacity-100')}
            onClick={() => setMenu((m) => !m)}
            aria-label="Project actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menu ? (
            <div
              className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-border bg-surface p-1 shadow-xl"
              onMouseLeave={() => setMenu(false)}
            >
              {onExport ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface-3"
                  onClick={() => {
                    onExport();
                    setMenu(false);
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Export project.json
                </button>
              ) : null}
              {onDuplicate ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-surface-3"
                  onClick={() => {
                    onDuplicate();
                    setMenu(false);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-danger hover:bg-danger/10"
                  onClick={() => {
                    onDelete();
                    setMenu(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
