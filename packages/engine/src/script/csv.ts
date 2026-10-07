import type { AssetType, SceneType, VideoProjectDraftInput } from '@guidedreel/schema';
import { assetTypeFromMime, getSceneDefinition, isSceneType } from '@guidedreel/schema';
import { VideoCreatorError } from '../errors';
import { createId } from '../ids';
import { fileExtension } from '../assets';

/**
 * Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF. No external dependency.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export type CsvRow = {
  order?: number;
  type?: string;
  script?: string;
  title?: string;
  media?: string;
  voice?: string;
  duration?: number;
  transition?: string;
};

const KNOWN_COLUMNS = [
  'order',
  'type',
  'script',
  'title',
  'media',
  'voice',
  'duration',
  'transition',
] as const;

export function csvRows(text: string): CsvRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2)
    throw new VideoCreatorError(
      'IMPORT_FAILED',
      'CSV must have a header row and at least one data row',
    );
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  if (!header.includes('script') && !header.includes('media')) {
    throw new VideoCreatorError(
      'IMPORT_FAILED',
      'CSV header must include a "script" or "media" column',
      {
        details: { header, expected: KNOWN_COLUMNS },
      },
    );
  }
  return rows.slice(1).map((cells, i) => {
    const get = (name: string) => {
      const idx = header.indexOf(name);
      return idx === -1 ? undefined : cells[idx]?.trim();
    };
    const num = (v: string | undefined) => {
      if (!v) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n))
        throw new VideoCreatorError('IMPORT_FAILED', `Row ${i + 2}: "${v}" is not a number`);
      return n;
    };
    return {
      order: num(get('order')),
      type: get('type') || undefined,
      script: get('script') || undefined,
      title: get('title') || undefined,
      media: get('media') || undefined,
      voice: get('voice') || undefined,
      duration: num(get('duration')),
      transition: get('transition') || undefined,
    };
  });
}

const VIDEO_EXT = new Set(['mp4', 'mov', 'webm', 'm4v']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg']);

function mediaType(fileName: string): AssetType | null {
  const ext = fileExtension(fileName);
  if (VIDEO_EXT.has(ext)) return 'video';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (AUDIO_EXT.has(ext)) return 'audio';
  return assetTypeFromMime(ext);
}

function inferType(row: CsvRow, index: number, total: number): SceneType {
  if (row.type) {
    const t = row.type.toLowerCase();
    if (isSceneType(t)) return t;
    throw new VideoCreatorError(
      'IMPORT_FAILED',
      `Row ${index + 2}: unknown scene type "${row.type}"`,
    );
  }
  if (row.media) {
    const mt = mediaType(row.media);
    if (mt === 'video') return 'video';
    if (mt === 'image') return index === 0 ? 'intro' : 'image';
  }
  if (index === 0) return 'hook';
  if (index === total - 1 && total >= 3) return 'cta';
  return 'text';
}

export type CsvImportOptions = {
  /** Resolves a media/voice file name from the CSV to an asset source. Default: a `store` key equal to the name. */
  resolveFile?: (
    fileName: string,
  ) =>
    { kind: 'local'; path: string } | { kind: 'url'; url: string } | { kind: 'store'; key: string };
};

/**
 * CSV columns: order, type?, script, title?, media?, voice?, duration?, transition?
 * Media/voice cells are file names; they become `store` assets by default so the
 * host app can attach the real files afterwards (or resolve via options.resolveFile).
 */
export function parseScriptCsv(
  text: string,
  options: CsvImportOptions = {},
): VideoProjectDraftInput {
  const rows = csvRows(text).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const resolveFile =
    options.resolveFile ?? ((fileName: string) => ({ kind: 'store' as const, key: fileName }));
  const assets: NonNullable<VideoProjectDraftInput['assets']> = [];
  const assetByName = new Map<string, string>();

  const ensureAsset = (fileName: string, type: AssetType): string => {
    const existing = assetByName.get(fileName);
    if (existing) return existing;
    const id = createId('ast');
    assets.push({ id, type, name: fileName, source: resolveFile(fileName) });
    assetByName.set(fileName, id);
    return id;
  };

  const scenes = rows.map((row, i) => {
    const type = inferType(row, i, rows.length);
    const def = getSceneDefinition(type);
    const props: Record<string, unknown> = {};
    if (row.script && def.scriptKey) props[def.scriptKey] = row.script;
    if (row.title && 'title' in (def.defaultProps() as object)) props.title = row.title;

    if (row.media) {
      const mt = mediaType(row.media);
      if (!mt)
        throw new VideoCreatorError(
          'UNSUPPORTED_MEDIA',
          `Row ${i + 2}: unsupported media file "${row.media}"`,
        );
      const assetId = ensureAsset(row.media, mt);
      if (type === 'video') props.videoAssetId = assetId;
      else if (type === 'image') props.imageAssetId = assetId;
      else if (type === 'feature') props.mediaAssetId = assetId;
      else if (type === 'product' || type === 'quote')
        props[type === 'product' ? 'imageAssetId' : 'avatarAssetId'] = assetId;
      else props.backgroundAssetId = assetId;
    }

    const voiceoverAssetId = row.voice ? ensureAsset(row.voice, 'voiceover') : undefined;
    const transitionIn = row.transition
      ? { type: row.transition.toLowerCase() as never, durationInFrames: 12 }
      : undefined;

    return {
      type,
      title: row.title,
      props,
      durationSeconds: row.duration,
      voiceoverAssetId,
      transitionIn,
    };
  });

  return { scenes, assets, metadata: { source: 'import' as const } };
}
