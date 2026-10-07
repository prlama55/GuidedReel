import path from 'node:path';
import { BINARY_EXTENSIONS } from './constants';

/**
 * Removes an indented block from YAML-like text: the line `<indent>key:` and every
 * following line that is blank or indented deeper than the key. Works for GitHub
 * workflow jobs, pnpm-lock importers and electron-builder sections. Returns the
 * input unchanged when the key is absent.
 */
export function removeIndentedBlock(text: string, key: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === `${indentOf(line)}${key}:`);
  if (start === -1) return text;
  const indent = indentOf(lines[start] ?? '').length;
  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end] ?? '';
    if (line.trim() !== '' && indentOf(line).length <= indent) break;
    end++;
  }
  // Keep a single blank line between the neighbours instead of the block's trailing blanks.
  while (end > start + 1 && (lines[end - 1] ?? '').trim() === '') end--;
  const next = lines[end];
  const removeCount = end - start + (next !== undefined && next.trim() === '' ? 1 : 0);
  lines.splice(start, removeCount);
  return lines.join('\n');
}

function indentOf(line: string): string {
  return line.match(/^\s*/)?.[0] ?? '';
}

/** Removes every line matching `pattern` (the pattern is tested per line, without the newline). */
export function removeLines(text: string, pattern: RegExp): string {
  return text
    .split('\n')
    .filter((line) => !pattern.test(line))
    .join('\n');
}

/** Sequential literal replacements; order matters when one needle contains another. */
export function replaceAll(text: string, pairs: ReadonlyArray<readonly [string, string]>): string {
  let out = text;
  for (const [from, to] of pairs) {
    if (from !== '' && from !== to) out = out.split(from).join(to);
  }
  return out;
}

export function isProbablyBinary(file: string, head: Uint8Array): boolean {
  if (BINARY_EXTENSIONS.has(path.extname(file).toLowerCase())) return true;
  const limit = Math.min(head.length, 8000);
  for (let i = 0; i < limit; i++) if (head[i] === 0) return true;
  return false;
}
