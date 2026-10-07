import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, FolderOpen, RefreshCw, Trash2, XCircle } from 'lucide-react';
import type { RenderJob } from '@guidedreel/schema';
import { TERMINAL_RENDER_STATUSES } from '@guidedreel/schema';
import { AppShell } from './AppShell';
import { Badge, Button, EmptyState, Skeleton } from '../primitives/index';
import { useHost } from '../host/HostContext';
import { formatBytes, formatRelative } from '../lib/format';

const TONE: Record<RenderJob['status'], 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> =
  {
    queued: 'neutral',
    preparing: 'primary',
    rendering: 'primary',
    encoding: 'primary',
    uploading: 'primary',
    completed: 'success',
    failed: 'danger',
    cancelled: 'warning',
  };

export const RendersPage: React.FC = () => {
  const { renderClient, platform } = useHost();
  const [jobs, setJobs] = useState<RenderJob[] | null>(null);
  const refresh = useCallback(async () => setJobs(await renderClient.list()), [renderClient]);
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <AppShell
      title="Render queue"
      actions={
        <Button size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }
    >
      {jobs === null ? (
        <Skeleton className="h-40" />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No renders yet"
          description="Export a video from the editor to see its progress here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((j) => {
            const running = !TERMINAL_RENDER_STATUSES.includes(j.status);
            return (
              <li
                key={j.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{j.projectName}</span>
                    <Badge tone={TONE[j.status]}>{j.status}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-muted">
                    {j.options.quality} · {j.options.codec.toUpperCase()} · started{' '}
                    {formatRelative(j.createdAt)}
                    {j.result ? ` · ${formatBytes(j.result.sizeBytes)}` : ''}
                    {j.error ? ` · ${j.error.message}` : ''}
                  </div>
                  {running ? (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full bg-primary transition-[width]"
                        style={{ width: `${Math.round(j.progress * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                {running ? (
                  <Button size="sm" variant="ghost" onClick={() => renderClient.cancel(j.id)}>
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </Button>
                ) : null}
                {j.status === 'completed' ? (
                  <Button size="sm" variant="primary" onClick={() => renderClient.openOutput(j)}>
                    {j.result?.outputUrl ? (
                      <>
                        <Download className="h-3.5 w-3.5" /> Download
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </>
                    )}
                  </Button>
                ) : null}
                {j.status === 'completed' &&
                renderClient.revealOutput &&
                platform.capabilities.revealInFolder ? (
                  <Button size="sm" onClick={() => renderClient.revealOutput!(j)}>
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                {!running && renderClient.remove ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await renderClient.remove!(j.id);
                      await refresh();
                    }}
                    aria-label="Remove job"
                    className="hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
};
