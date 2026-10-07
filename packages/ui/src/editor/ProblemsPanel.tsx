import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useEditorStore } from '../store/editor-store';
import { Button } from '../primitives/index';
import { cn } from '../lib/cn';

export const ProblemsPanel: React.FC = () => {
  const problems = useEditorStore((s) => s.problems);
  const toggle = useEditorStore((s) => s.toggleProblems);
  const select = useEditorStore((s) => s.select);
  return (
    <div className="flex h-full flex-col border-l border-border bg-surface">
      <div className="flex h-9 items-center justify-between border-b border-border px-3 text-xs font-semibold">
        <span>Problems · {problems.length}</span>
        <Button size="icon" variant="ghost" onClick={toggle} aria-label="Close problems">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {problems.length === 0 ? (
          <li className="flex items-center gap-2 p-2 text-xs text-fg-muted">
            <CheckCircle2 className="h-4 w-4 text-success" /> No problems found
          </li>
        ) : null}
        {problems.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!p.sceneId}
              onClick={() => p.sceneId && select({ kind: 'scene', sceneId: p.sceneId })}
              className="flex w-full items-start gap-2 rounded-md p-2 text-left text-xs hover:bg-surface-2 disabled:cursor-default"
            >
              <AlertTriangle
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  p.severity === 'error' ? 'text-danger' : 'text-warning',
                )}
              />
              <span>{p.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
