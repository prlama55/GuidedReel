import { ACCEPTED_MIME_TYPES } from '@guidedreel/schema';
import type { PickFilesOptions, PickedFile, PlatformAdapter, SaveFileOptions } from './types';

export function acceptForAssetTypes(types?: PickFilesOptions['assetTypes']): string {
  const list =
    types && types.length > 0
      ? types
      : (Object.keys(ACCEPTED_MIME_TYPES) as (keyof typeof ACCEPTED_MIME_TYPES)[]);
  return [...new Set(list.flatMap((t) => ACCEPTED_MIME_TYPES[t]))].join(',');
}

export function pickedFileFromFile(file: File): PickedFile {
  return {
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    blob: file,
  };
}

/** Browser implementation: <input type=file> and anchor downloads. */
export const webPlatform: PlatformAdapter = {
  name: 'web',
  capabilities: { localRender: false, revealInFolder: false, nativeFileDialogs: false },
  pickFiles(options = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple ?? true;
      input.accept = acceptForAssetTypes(options.assetTypes);
      input.style.display = 'none';
      input.onchange = () => {
        resolve([...(input.files ?? [])].map(pickedFileFromFile));
        input.remove();
      };
      // Cancel: resolve empty when focus returns without a change.
      window.addEventListener(
        'focus',
        () =>
          setTimeout(() => {
            if (input.isConnected && !input.files?.length) {
              resolve([]);
              input.remove();
            }
          }, 400),
        { once: true },
      );
      document.body.appendChild(input);
      input.click();
    });
  },
  async saveFile({ suggestedName, data }: SaveFileOptions) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return suggestedName;
  },
  async openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
