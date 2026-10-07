import type { AssetType } from '@guidedreel/schema';

export type PickedFile = {
  name: string;
  size: number;
  mimeType: string;
  /** Present when the host can hand over bytes (web, drag-and-drop). */
  blob?: Blob;
  /** Present when the host can reference the file in place (desktop native dialog). */
  path?: string;
};

export type PickFilesOptions = {
  multiple?: boolean;
  /** Restrict to asset types; the host maps to MIME filters / extensions. */
  assetTypes?: AssetType[];
};

export type SaveFileOptions = {
  suggestedName: string;
  mimeType?: string;
  /** Bytes to save (web download / desktop write). */
  data: Blob;
};

/**
 * Everything the shared UI needs from its host that differs between browser
 * and Electron. Components never touch <input type=file> or IPC directly.
 */
export interface PlatformAdapter {
  readonly name: 'web' | 'desktop';
  readonly capabilities: {
    localRender: boolean;
    revealInFolder: boolean;
    nativeFileDialogs: boolean;
  };
  pickFiles(options?: PickFilesOptions): Promise<PickedFile[]>;
  saveFile(options: SaveFileOptions): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  revealInFolder?(path: string): Promise<void>;
  openPath?(path: string): Promise<void>;
  /** Called when the document's dirty state changes (desktop shows a dot in the title bar). */
  setDocumentEdited?(edited: boolean): void;
}
