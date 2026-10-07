import type { VideoProject } from '@guidedreel/schema';
import { parseProjectDocument, type ValidationResult } from '@guidedreel/schema';

/** project.json contents. Stable key order for readable diffs. */
export function serializeProject(project: VideoProject): string {
  return JSON.stringify(project, null, 2);
}

/** Parses, migrates and validates a project.json string. */
export function deserializeProject(text: string): ValidationResult<VideoProject> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      success: false,
      issues: [{ path: '(root)', message: 'File is not valid JSON', code: 'invalid_json' }],
    };
  }
  return parseProjectDocument(raw);
}

/**
 * Future "project package" layout. Documented now so the desktop exporter and
 * the web importer agree on it when it is implemented.
 */
export type ProjectPackageManifest = {
  manifestVersion: 1;
  project: 'project.json';
  assets: { assetId: string; path: `assets/${string}` }[];
  fonts: { assetId: string; path: `fonts/${string}` }[];
  previews?: { sceneId: string; path: `previews/${string}` }[];
};
