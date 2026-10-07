export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(0, Math.round(seconds * fps));
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/** mm:ss.ff style timecode, e.g. 01:04.12 */
export function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const frames = Math.floor(frame % fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}.${pad(frames)}`;
}

/** Human duration, e.g. 32.5s or 1m 04s */
export function formatDuration(frames: number, fps: number): string {
  const s = frames / fps;
  if (s < 60) return `${Math.round(s * 10) / 10}s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s % 60);
  return `${m}m ${pad(rest)}s`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
