import { z } from 'zod';
import {
  AssetTypeSchema,
  RenderJobSchema,
  RenderOptionsSchema,
  VideoProjectSchema,
} from '@guidedreel/core';
import type { RenderJob, VideoProject } from '@guidedreel/core';

/**
 * IPC contract shared by main, preload and renderer. Every channel has a Zod
 * schema for its arguments; main validates before acting.
 */
export const StoredAssetMetaSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: AssetTypeSchema,
  mimeType: z.string(),
  size: z.number(),
  createdAt: z.string(),
});
export type StoredAssetMetaDTO = z.infer<typeof StoredAssetMetaSchema>;

export const PickedFileDTOSchema = z.object({
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  path: z.string(),
});
export type PickedFileDTO = z.infer<typeof PickedFileDTOSchema>;

export const IPC = {
  'projects:list': { args: z.tuple([]) },
  'projects:get': { args: z.tuple([z.string()]) },
  'projects:save': { args: z.tuple([VideoProjectSchema]) },
  'projects:delete': { args: z.tuple([z.string()]) },

  'assets:put': {
    args: z.tuple([
      z.string(),
      z.instanceof(Uint8Array),
      StoredAssetMetaSchema.omit({ key: true, size: true, createdAt: true }),
    ]),
  },
  'assets:getMeta': { args: z.tuple([z.string()]) },
  'assets:delete': { args: z.tuple([z.string()]) },
  'assets:list': { args: z.tuple([]) },
  'assets:allowLocal': { args: z.tuple([z.array(z.string())]) },

  'dialog:pickFiles': {
    args: z.tuple([
      z
        .object({
          multiple: z.boolean().optional(),
          assetTypes: z.array(AssetTypeSchema).optional(),
        })
        .optional(),
    ]),
  },
  'dialog:saveFile': {
    args: z.tuple([
      z.object({
        suggestedName: z.string(),
        filters: z
          .array(z.object({ name: z.string(), extensions: z.array(z.string()) }))
          .optional(),
      }),
      z.instanceof(Uint8Array),
    ]),
  },
  'dialog:chooseOutput': { args: z.tuple([z.string(), z.string()]) },

  'shell:openExternal': { args: z.tuple([z.url()]) },
  'shell:revealInFolder': { args: z.tuple([z.string()]) },
  'shell:openPath': { args: z.tuple([z.string()]) },

  'render:start': {
    args: z.tuple([VideoProjectSchema, RenderOptionsSchema.partial(), z.string().optional()]),
  },
  'render:get': { args: z.tuple([z.string()]) },
  'render:list': { args: z.tuple([]) },
  'render:cancel': { args: z.tuple([z.string()]) },
  'render:remove': { args: z.tuple([z.string()]) },

  'tts:providers': { args: z.tuple([]) },
  'tts:voices': { args: z.tuple([z.string()]) },
  'tts:synthesize': {
    args: z.tuple([
      z.object({
        provider: z.string(),
        voiceId: z.string(),
        text: z.string().max(5000),
        speed: z.number().min(0.5).max(2).optional(),
        language: z.string().optional(),
      }),
    ]),
  },
  'tts:installVoice': { args: z.tuple([z.string()]) },
  'tts:removeVoice': { args: z.tuple([z.string()]) },
  'secrets:set': { args: z.tuple([z.string(), z.string()]) },
  'secrets:has': { args: z.tuple([z.string()]) },

  'app:setDocumentEdited': { args: z.tuple([z.boolean()]) },
  'app:getInfo': { args: z.tuple([]) },
} as const;

export type IpcChannel = keyof typeof IPC;

export type MenuAction =
  | 'new-project'
  | 'open-projects'
  | 'import-project'
  | 'export-project'
  | 'export-video'
  | 'undo'
  | 'redo'
  | 'shortcuts'
  | 'settings'
  | 'save';

export type AppInfo = {
  version: string;
  platform: 'darwin' | 'win32' | 'linux' | (string & {});
  userDataPath: string;
};

export const ASSET_PROTOCOL = 'vc-asset';

export type DesktopApi = {
  projects: {
    list(): Promise<
      {
        id: string;
        name: string;
        templateId: string;
        format: VideoProject['format'];
        sceneCount: number;
        createdAt: string;
        updatedAt: string;
      }[]
    >;
    get(id: string): Promise<VideoProject | null>;
    save(project: VideoProject): Promise<void>;
    delete(id: string): Promise<void>;
  };
  assets: {
    put(
      key: string,
      bytes: Uint8Array,
      meta: Omit<StoredAssetMetaDTO, 'key' | 'size' | 'createdAt'>,
    ): Promise<StoredAssetMetaDTO>;
    getMeta(key: string): Promise<StoredAssetMetaDTO | null>;
    delete(key: string): Promise<void>;
    list(): Promise<StoredAssetMetaDTO[]>;
    allowLocal(paths: string[]): Promise<void>;
  };
  dialog: {
    pickFiles(options?: { multiple?: boolean; assetTypes?: string[] }): Promise<PickedFileDTO[]>;
    saveFile(
      options: { suggestedName: string; filters?: { name: string; extensions: string[] }[] },
      bytes: Uint8Array,
    ): Promise<string | null>;
    chooseOutput(suggestedName: string, extension: string): Promise<string | null>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
    revealInFolder(path: string): Promise<void>;
    openPath(path: string): Promise<void>;
  };
  render: {
    start(
      project: VideoProject,
      options: Record<string, unknown>,
      outputPath?: string,
    ): Promise<RenderJob>;
    get(id: string): Promise<RenderJob | null>;
    list(): Promise<RenderJob[]>;
    cancel(id: string): Promise<void>;
    remove(id: string): Promise<void>;
    onUpdate(cb: (job: RenderJob) => void): () => void;
  };
  app: {
    setDocumentEdited(edited: boolean): Promise<void>;
    getInfo(): Promise<AppInfo>;
    onMenuAction(cb: (action: MenuAction) => void): () => void;
  };
  tts: {
    providers(): Promise<
      {
        id: string;
        label: string;
        kind: 'cloud' | 'local';
        available: boolean;
        reason?: string;
        keyHint?: string;
        docsUrl?: string;
      }[]
    >;
    voices(provider: string): Promise<unknown[]>;
    synthesize(req: {
      provider: string;
      voiceId: string;
      text: string;
      speed?: number;
      language?: string;
    }): Promise<{ bytes: Uint8Array; mimeType: string }>;
    installVoice(voiceId: string): Promise<void>;
    removeVoice(voiceId: string): Promise<void>;
    onInstallProgress(
      cb: (p: { voiceId: string; phase: string; progress: number; message?: string }) => void,
    ): () => void;
  };
  secrets: { set(name: string, value: string): Promise<void>; has(name: string): Promise<boolean> };
  /** Absolute path for a File dropped from the OS (Electron webUtils). */
  getPathForFile(file: File): string;
};

export { RenderJobSchema };
