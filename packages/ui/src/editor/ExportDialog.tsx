import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FolderOpen, XCircle, ExternalLink } from 'lucide-react';
import type { RenderJob, RenderQuality, VideoCodec } from '@guidedreel/schema';
import { QUALITY_PRESETS, TERMINAL_RENDER_STATUSES } from '@guidedreel/schema';
import { calculateTimeline, formatDuration } from '@guidedreel/engine';
import { Button, Dialog, Field, Input, Select, Switch, useToast } from '../primitives/index';
import { useHost } from '../host/HostContext';
import { useEditorStore } from '../store/editor-store';
import { formatBytes } from '../lib/format';
import { cn } from '../lib/cn';

const STAGES: { key: RenderJob['status'][]; label: string }[] = [
  { key: ['queued'], label: 'Queued' },
  { key: ['preparing'], label: 'Preparing' },
  { key: ['rendering'], label: 'Rendering' },
  { key: ['encoding'], label: 'Encoding' },
  { key: ['uploading'], label: 'Uploading' },
  { key: ['completed'], label: 'Done' },
];

export const ExportDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { renderClient, platform } = useHost();
  const project = useEditorStore((s) => s.project);
  const problems = useEditorStore((s) => s.problems);
  const toast = useToast();
  const [quality, setQuality] = useState<RenderQuality>('standard');
  const [codec, setCodec] = useState<VideoCodec>('h264');
  const [muted, setMuted] = useState(false);
  const [fileName, setFileName] = useState('');
  const [job, setJob] = useState<RenderJob | null>(null);
  const [starting, setStarting] = useState(false);
  const unsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (open && project) setFileName(project.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'video');
    if (!open) {
      unsub.current?.();
      unsub.current = null;
      setJob(null);
    }
  }, [open, project]);

  const estimate = useMemo(() => {
    if (!project) return null;
    const { totalFrames } = calculateTimeline(project);
    const seconds = totalFrames / project.format.fps;
    const preset = QUALITY_PRESETS[quality];
    const pixels = project.format.width * project.format.height * preset.scale * preset.scale;
    const mbps =
      (pixels / (1920 * 1080)) * (quality === 'high' ? 10 : quality === 'standard' ? 6 : 2);
    return {
      seconds,
      totalFrames,
      bytes: (mbps * 1e6 * seconds) / 8,
      width: Math.round(project.format.width * preset.scale),
      height: Math.round(project.format.height * preset.scale),
    };
  }, [project, quality]);

  if (!project) return null;
  const errors = problems.filter((p) => p.severity === 'error');
  const running = job && !TERMINAL_RENDER_STATUSES.includes(job.status);

  const start = async () => {
    setStarting(true);
    try {
      const created = await renderClient.start(project, { codec, quality, muted, fileName });
      setJob(created);
      unsub.current = renderClient.subscribe(created.id, (j) => {
        setJob(j);
        if (j.status === 'completed')
          toast.push({
            kind: 'success',
            title: 'Render complete',
            description: j.result?.sizeBytes ? formatBytes(j.result.sizeBytes) : undefined,
          });
        if (j.status === 'failed')
          toast.push({ kind: 'error', title: 'Render failed', description: j.error?.message });
      });
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Could not start render',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={job ? 'Rendering' : 'Export video'}
      size="md"
      locked={Boolean(running)}
      footer={
        job ? (
          running ? (
            <Button variant="danger" onClick={() => renderClient.cancel(job.id)}>
              Cancel render
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setJob(null)}>
                Export again
              </Button>
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </>
          )
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={start}
              loading={starting}
              disabled={errors.length > 0 || project.scenes.length === 0}
            >
              Start render
            </Button>
          </>
        )
      }
    >
      {job ? (
        <JobProgress
          job={job}
          onOpen={() => renderClient.openOutput(job)}
          onReveal={
            renderClient.revealOutput && platform.capabilities.revealInFolder
              ? () => renderClient.revealOutput!(job)
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(QUALITY_PRESETS) as RenderQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={cn(
                  'rounded-md border p-2.5 text-left',
                  quality === q
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface-2 hover:border-border-strong',
                )}
              >
                <div className="text-sm font-medium">{QUALITY_PRESETS[q].label}</div>
                <div className="text-[11px] text-fg-muted">{QUALITY_PRESETS[q].hint}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Codec">
              <Select value={codec} onChange={(e) => setCodec(e.target.value as VideoCodec)}>
                <option value="h264">H.264 (MP4) — recommended</option>
                <option value="h265">H.265 (MP4)</option>
                <option value="vp9">VP9 (WebM)</option>
                <option value="prores">ProRes (MOV)</option>
              </Select>
            </Field>
            <Field label="File name">
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-fg-muted">Export without audio</span>
            <Switch checked={muted} onCheckedChange={setMuted} aria-label="Mute" />
          </div>
          {estimate ? (
            <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2 p-3 text-xs">
              <div>
                <dt className="text-fg-subtle">Length</dt>
                <dd className="font-medium">
                  {formatDuration(estimate.totalFrames, project.format.fps)}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Output</dt>
                <dd className="font-medium">
                  {estimate.width}×{estimate.height} · {project.format.fps} fps
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle">Est. size</dt>
                <dd className="font-medium">~{formatBytes(estimate.bytes)}</dd>
              </div>
            </dl>
          ) : null}
          {errors.length > 0 ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
              Fix {errors.length} problem{errors.length > 1 ? 's' : ''} before exporting:{' '}
              {errors[0]?.message}
            </div>
          ) : null}
          {!platform.capabilities.localRender ? (
            <p className="text-[11px] text-fg-subtle">
              Rendering happens on the server. Assets stored in your browser are uploaded for this
              render only.
            </p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
};

export const JobProgress: React.FC<{
  job: RenderJob;
  onOpen: () => void;
  onReveal?: () => void;
}> = ({ job, onOpen, onReveal }) => {
  const currentIdx = STAGES.findIndex((s) => s.key.includes(job.status));
  const pct = Math.round((job.progress ?? 0) * 100);
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex items-center gap-1 text-[11px]">
        {STAGES.map((s, i) => {
          const done = job.status === 'completed' ? true : i < currentIdx;
          const active = i === currentIdx && job.status !== 'completed';
          return (
            <li key={s.label} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  done ? 'bg-success' : active ? 'bg-primary animate-pulse' : 'bg-border-strong',
                )}
              />
              <span className={cn(done || active ? 'text-fg' : 'text-fg-subtle')}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-fg-muted capitalize">
            {job.status}
            {job.renderedFrames !== undefined && job.totalFrames
              ? ` · frame ${job.renderedFrames}/${job.totalFrames}`
              : ''}
          </span>
          <span className="font-mono tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn(
              'h-full rounded-full transition-[width]',
              job.status === 'failed'
                ? 'bg-danger'
                : job.status === 'cancelled'
                  ? 'bg-border-strong'
                  : 'bg-primary',
            )}
            style={{
              width: `${job.status === 'failed' || job.status === 'cancelled' ? 100 : pct}%`,
            }}
          />
        </div>
      </div>
      {job.status === 'completed' && job.result ? (
        <div className="flex items-center gap-3 rounded-md border border-success/40 bg-success/10 p-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div className="flex-1 text-xs">
            <div className="font-medium">Your video is ready</div>
            <div className="text-fg-muted">
              {formatBytes(job.result.sizeBytes)} · {(job.result.durationMs / 1000).toFixed(0)}s
              render
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={onOpen}>
            {job.result.outputUrl ? (
              <>
                <Download className="h-3.5 w-3.5" /> Download
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </>
            )}
          </Button>
          {onReveal ? (
            <Button size="sm" onClick={onReveal}>
              <FolderOpen className="h-3.5 w-3.5" /> Reveal
            </Button>
          ) : null}
        </div>
      ) : null}
      {job.status === 'failed' ? (
        <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs">
          <XCircle className="mt-0.5 h-4 w-4 text-danger" />
          <div>
            <div className="font-medium">Render failed</div>
            <div className="text-fg-muted">
              {job.error?.message ?? 'Unknown error'}
              {job.error?.code ? ` (${job.error.code})` : ''}
            </div>
          </div>
        </div>
      ) : null}
      {job.status === 'cancelled' ? (
        <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-fg-muted">
          Render cancelled.
        </div>
      ) : null}
    </div>
  );
};
