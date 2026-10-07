import type { z } from 'zod';
import { VideoProjectSchema, type VideoProject } from './project';
import { migrateProjectDocument, MigrationError } from './migrations';

export type ValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export type ValidationResult<T> =
  | { success: true; data: T; issues: [] }
  | { success: false; data?: undefined; issues: ValidationIssue[] };

export function formatZodIssues(issues: z.core.$ZodIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
    code: issue.code,
  }));
}

/** Validate an already-current project object. */
export function validateProject(input: unknown): ValidationResult<VideoProject> {
  const result = VideoProjectSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data, issues: [] };
  return { success: false, issues: formatZodIssues(result.error.issues) };
}

/** Migrate (if needed) then validate. Use for anything read from disk / network. */
export function parseProjectDocument(input: unknown): ValidationResult<VideoProject> {
  try {
    const migrated = migrateProjectDocument(input);
    return validateProject(migrated);
  } catch (err) {
    if (err instanceof MigrationError) {
      return {
        success: false,
        issues: [{ path: 'schemaVersion', message: err.message, code: 'migration' }],
      };
    }
    throw err;
  }
}

/** Human-readable path, e.g. "scenes[2].props.title". */
export function humanizeIssuePath(path: string): string {
  return path.replace(/\.(\d+)(?=\.|$)/g, '[$1]');
}
