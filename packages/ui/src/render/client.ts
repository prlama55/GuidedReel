import type { RenderJob, RenderOptionsInput, VideoProject } from '@guidedreel/schema';

/**
 * How the UI talks to a renderer. Web: HTTP to /api/render with polling.
 * Desktop: IPC to the main process. Same UI code either way.
 */
export interface RenderClient {
  start(project: VideoProject, options: RenderOptionsInput): Promise<RenderJob>;
  get(jobId: string): Promise<RenderJob | null>;
  list(): Promise<RenderJob[]>;
  cancel(jobId: string): Promise<void>;
  /** Push or poll; returns an unsubscribe function. */
  subscribe(jobId: string, onUpdate: (job: RenderJob) => void): () => void;
  /** Web: a URL to download; desktop: opens the file. */
  openOutput(job: RenderJob): Promise<void>;
  revealOutput?(job: RenderJob): Promise<void>;
  remove?(jobId: string): Promise<void>;
}

/** Builds a subscribe() from a get() by polling until the job is terminal. */
export function pollingSubscribe(
  get: RenderClient['get'],
  intervalMs = 750,
): RenderClient['subscribe'] {
  return (jobId, onUpdate) => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      try {
        const job = await get(jobId);
        if (job) {
          onUpdate(job);
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')
            return;
        }
      } catch {
        // transient; keep polling
      }
      timer = setTimeout(tick, intervalMs);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  };
}
