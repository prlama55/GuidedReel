import type { VideoProjectDraftInput } from '@guidedreel/schema';
import { VideoProjectDraftSchema, formatZodIssues } from '@guidedreel/schema';
import { VideoCreatorError } from '../errors';

/**
 * Accepts either a VideoProjectDraft or a bare array of draft scenes.
 */
export function parseScriptJson(text: string): VideoProjectDraftInput {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new VideoCreatorError('IMPORT_FAILED', 'File is not valid JSON', { cause: err });
  }
  const candidate = Array.isArray(raw) ? { scenes: raw } : raw;
  const result = VideoProjectDraftSchema.safeParse(candidate);
  if (!result.success) {
    throw new VideoCreatorError(
      'VALIDATION_FAILED',
      'JSON does not match the project draft format',
      {
        details: { issues: formatZodIssues(result.error.issues) },
      },
    );
  }
  return { ...result.data, metadata: { ...(result.data.metadata ?? {}), source: 'import' } };
}
