import { LOCKFILE } from './constants';

/**
 * npm strips `.gitignore`, `.npmrc` and lockfiles from published packages, so the
 * embedded template stores every dot-prefixed path segment as `_segment` and the
 * lockfile as `_pnpm-lock.yaml`. The snapshot asserts that no tracked path segment
 * starts with `_`, which keeps decoding unambiguous.
 */
export function encodeTemplatePath(rel: string): string {
  return rel
    .split('/')
    .map((segment) => {
      if (segment === LOCKFILE) return `_${LOCKFILE}`;
      return segment.startsWith('.') ? `_${segment.slice(1)}` : segment;
    })
    .join('/');
}

export function decodeTemplatePath(rel: string): string {
  return rel
    .split('/')
    .map((segment) => {
      if (segment === `_${LOCKFILE}`) return LOCKFILE;
      return segment.startsWith('_') ? `.${segment.slice(1)}` : segment;
    })
    .join('/');
}

/** True when `rel` (POSIX) matches an entry of a path list (file match or directory prefix). */
export function matchesPathList(rel: string, list: readonly string[]): boolean {
  return list.some((entry) => (entry.endsWith('/') ? rel.startsWith(entry) : rel === entry));
}

export function toPosix(p: string): string {
  return p.split('\\').join('/');
}
