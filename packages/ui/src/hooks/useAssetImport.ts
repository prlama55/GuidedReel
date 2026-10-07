import { useCallback } from 'react';
import type { Asset, AssetType } from '@guidedreel/schema';
import { ACCEPTED_MIME_TYPES, assetTypeFromMime } from '@guidedreel/schema';
import { createAsset, createId, fileExtension, VideoCreatorError } from '@guidedreel/engine';
import { readMediaMetadata } from '@guidedreel/storage';
import { useHost } from '../host/HostContext';
import { useEditorStore } from '../store/editor-store';
import { useToast } from '../primitives/Toast';
import type { PickedFile } from '../platform/types';

export const MAX_ASSET_BYTES = 500 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  m4v: 'video/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

export function guessMime(file: Pick<PickedFile, 'name' | 'mimeType'>): string {
  if (file.mimeType && file.mimeType !== 'application/octet-stream') return file.mimeType;
  return EXT_MIME[fileExtension(file.name)] ?? 'application/octet-stream';
}

/** Validates a picked file; returns the asset type or throws a structured error. */
export function classifyFile(file: PickedFile, preferred?: AssetType): AssetType {
  const mime = guessMime(file);
  if (file.size > MAX_ASSET_BYTES) {
    throw new VideoCreatorError(
      'FILE_TOO_LARGE',
      `"${file.name}" is larger than ${MAX_ASSET_BYTES / 1024 / 1024} MB`,
    );
  }
  const base = assetTypeFromMime(mime);
  if (!base)
    throw new VideoCreatorError(
      'UNSUPPORTED_MEDIA',
      `"${file.name}" (${mime}) is not a supported image, video, audio or font file`,
    );
  let type: AssetType = base;
  if (preferred) {
    const compatible =
      (preferred === 'logo' && base === 'image') ||
      ((preferred === 'voiceover' || preferred === 'music') && base === 'audio') ||
      preferred === base;
    if (compatible) type = preferred;
  }
  if (!ACCEPTED_MIME_TYPES[type].includes(mime) && mime !== 'application/octet-stream') {
    throw new VideoCreatorError(
      'UNSUPPORTED_MEDIA',
      `"${file.name}" uses ${mime}, which is not supported for ${type}`,
    );
  }
  return type;
}

export type ImportedAsset = { asset: Asset; file: PickedFile };

/**
 * Shared import flow: validate → store bytes (or reference path) → read media
 * metadata → add Asset to the project. Returns the created assets.
 */
export function useAssetImport() {
  const { storage, assetResolver } = useHost();
  const addAsset = useEditorStore((s) => s.addAsset);
  const toast = useToast();

  const importFiles = useCallback(
    async (files: PickedFile[], preferred?: AssetType): Promise<Asset[]> => {
      const created: Asset[] = [];
      for (const file of files) {
        try {
          const type = classifyFile(file, preferred);
          const mime = guessMime(file);
          let asset: Asset;
          if (file.path) {
            asset = createAsset({
              type,
              name: file.name,
              source: { kind: 'local', path: file.path },
              mimeType: mime,
              size: file.size,
            });
          } else if (file.blob) {
            const key = `${createId('as')}.${fileExtension(file.name) || 'bin'}`;
            const meta = await storage.assets.put(key, file.blob, {
              name: file.name,
              type,
              mimeType: mime,
            });
            asset = createAsset({
              type,
              name: file.name,
              source: { kind: 'store', key: meta.key },
              mimeType: mime,
              size: meta.size,
            });
          } else {
            throw new VideoCreatorError('IMPORT_FAILED', `"${file.name}" has no data`);
          }
          // Metadata (duration / dimensions) for the timeline and inspector.
          try {
            const blob: Blob =
              file.blob ?? (await fetch(await assetResolver.resolve(asset)).then((r) => r.blob()));
            const m = await readMediaMetadata(blob, type);
            asset = { ...asset, ...m };
          } catch {
            // metadata is best-effort
          }
          if (type === 'font') asset = { ...asset, fontFamily: file.name.replace(/\.[^.]+$/, '') };
          addAsset(asset);
          created.push(asset);
        } catch (err) {
          const e =
            err instanceof VideoCreatorError
              ? err
              : new VideoCreatorError('IMPORT_FAILED', `Could not import "${file.name}"`, {
                  cause: err,
                });
          toast.push({ kind: 'error', title: 'Import failed', description: e.message });
        }
      }
      if (created.length > 0)
        toast.push({
          kind: 'success',
          title:
            created.length === 1 ? `Added ${created[0]!.name}` : `Added ${created.length} assets`,
        });
      return created;
    },
    [storage, assetResolver, addAsset, toast],
  );

  return { importFiles };
}
