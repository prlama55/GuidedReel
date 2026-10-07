import type { SceneType, VideoProjectDraftInput } from '@guidedreel/schema';
import { getSceneDefinition } from '@guidedreel/schema';

export type TextScriptOptions = {
  /** Scene type for the first paragraph. */
  firstSceneType?: SceneType;
  /** Scene type for the middle paragraphs. */
  defaultSceneType?: SceneType;
  /** Scene type for the last paragraph (only when there are ≥ 3 paragraphs). */
  lastSceneType?: SceneType;
  /** Seconds per word used to estimate durations; clamped to each scene's minimum. */
  secondsPerWord?: number;
  minSeconds?: number;
  maxSeconds?: number;
};

const DEFAULTS: Required<TextScriptOptions> = {
  firstSceneType: 'hook',
  defaultSceneType: 'text',
  lastSceneType: 'cta',
  secondsPerWord: 0.4,
  minSeconds: 2.5,
  maxSeconds: 10,
};

/** Splits free text into paragraphs (blank-line separated; single newlines are kept inside a paragraph). */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function estimateSeconds(
  text: string,
  options: Pick<Required<TextScriptOptions>, 'secondsPerWord' | 'minSeconds' | 'maxSeconds'>,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const raw = words * options.secondsPerWord + 1;
  return Math.min(options.maxSeconds, Math.max(options.minSeconds, Math.round(raw * 2) / 2));
}

/**
 * One paragraph → one scene. The text goes into the scene type's `scriptKey`.
 */
export function parseScriptText(
  text: string,
  options: TextScriptOptions = {},
): VideoProjectDraftInput {
  const opts = { ...DEFAULTS, ...options };
  const paragraphs = splitParagraphs(text);
  const scenes = paragraphs.map((paragraph, i) => {
    let type: SceneType = opts.defaultSceneType;
    if (i === 0) type = opts.firstSceneType;
    else if (i === paragraphs.length - 1 && paragraphs.length >= 3) type = opts.lastSceneType;
    const def = getSceneDefinition(type);
    const key = def.scriptKey ?? 'text';
    return {
      type,
      props: { [key]: paragraph },
      durationSeconds: estimateSeconds(paragraph, opts),
    };
  });
  return { scenes, metadata: { source: 'import' as const } };
}
