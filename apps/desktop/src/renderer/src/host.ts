import type { Asset, RenderJob, RenderOptionsInput, VideoProject } from '@guidedreel/core';
import type { AssetResolver } from '@guidedreel/core';
import type { AssetStore, ProjectRepository, StoredAssetMeta } from '@guidedreel/core/storage';
import type {
  PlatformAdapter,
  RenderClient,
  TtsClient,
  TtsProviderId,
  TtsProviderInfo,
  SynthesizeRequest,
  InstallProgress,
} from '@guidedreel/core/ui';
import type { TtsVoice } from '@guidedreel/core';
import type { CloudTtsProviderId } from '@guidedreel/core/providers';
import { ASSET_PROTOCOL } from '../../shared/ipc';

const vc = () => window.vc;

/** ProjectRepository over IPC → userData/projects/*.json */
export class DesktopProjectRepository implements ProjectRepository {
  list() {
    return vc().projects.list();
  }
  get(id: string) {
    return vc().projects.get(id);
  }
  save(project: VideoProject) {
    return vc().projects.save(project);
  }
  delete(id: string) {
    return vc().projects.delete(id);
  }
}

/** AssetStore over IPC → userData/assets/* ; URLs use the vc-asset:// protocol. */
export class DesktopAssetStore implements AssetStore {
  async put(key: string, data: Blob, meta: Omit<StoredAssetMeta, 'key' | 'size' | 'createdAt'>) {
    const bytes = new Uint8Array(await data.arrayBuffer());
    return vc().assets.put(key, bytes, meta);
  }
  async get(key: string) {
    const res = await fetch(storeUrl(key));
    return res.ok ? res.blob() : null;
  }
  getMeta(key: string) {
    return vc().assets.getMeta(key);
  }
  async getUrl(key: string) {
    return storeUrl(key);
  }
  delete(key: string) {
    return vc().assets.delete(key);
  }
  list() {
    return vc().assets.list();
  }
}

export function storeUrl(key: string) {
  return `${ASSET_PROTOCOL}://store/${encodeURIComponent(key)}`;
}
export function localUrl(filePath: string) {
  return `${ASSET_PROTOCOL}://local/${encodeURIComponent(filePath)}`;
}

export const desktopAssetResolver: AssetResolver = {
  async resolve(asset: Asset) {
    switch (asset.source.kind) {
      case 'url':
        return asset.source.url;
      case 'store':
        return storeUrl(asset.source.key);
      case 'local':
        await vc().assets.allowLocal([asset.source.path]);
        return localUrl(asset.source.path);
      case 'cloud':
        throw new Error(`Cloud assets are not configured ("${asset.name}")`);
    }
  },
};

export const desktopPlatform: PlatformAdapter = {
  name: 'desktop',
  capabilities: { localRender: true, revealInFolder: true, nativeFileDialogs: true },
  async pickFiles(options) {
    const files = await vc().dialog.pickFiles(options);
    return files.map((f) => ({ name: f.name, size: f.size, mimeType: f.mimeType, path: f.path }));
  },
  async saveFile({ suggestedName, data }) {
    const ext = suggestedName.split('.').pop() ?? '';
    return vc().dialog.saveFile(
      {
        suggestedName,
        filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
      },
      new Uint8Array(await data.arrayBuffer()),
    );
  },
  openExternal: (url) => vc().shell.openExternal(url),
  revealInFolder: (p) => vc().shell.revealInFolder(p),
  openPath: (p) => vc().shell.openPath(p),
  setDocumentEdited: (edited) => void vc().app.setDocumentEdited(edited),
};

/** RenderClient over IPC; asks for an output location first, then streams progress events. */
export class DesktopRenderClient implements RenderClient {
  private listeners = new Map<string, Set<(job: RenderJob) => void>>();
  constructor() {
    vc().render.onUpdate((job) => this.listeners.get(job.id)?.forEach((cb) => cb(job)));
  }
  async start(project: VideoProject, options: RenderOptionsInput) {
    const codec = options.codec ?? 'h264';
    const ext = codec === 'prores' ? 'mov' : codec.startsWith('vp') ? 'webm' : 'mp4';
    const outputPath = await vc().dialog.chooseOutput(
      (options.fileName ?? project.name).replace(/[\\/:*?"<>|]/g, '') || 'video',
      ext,
    );
    if (!outputPath) throw new Error('Export cancelled');
    return vc().render.start(project, options as Record<string, unknown>, outputPath);
  }
  get(id: string) {
    return vc().render.get(id);
  }
  list() {
    return vc().render.list();
  }
  cancel(id: string) {
    return vc().render.cancel(id);
  }
  remove(id: string) {
    return vc().render.remove(id);
  }
  subscribe(jobId: string, onUpdate: (job: RenderJob) => void) {
    const set = this.listeners.get(jobId) ?? new Set();
    set.add(onUpdate);
    this.listeners.set(jobId, set);
    void this.get(jobId).then((j) => j && onUpdate(j));
    return () => {
      set.delete(onUpdate);
    };
  }
  async openOutput(job: RenderJob) {
    if (job.result?.outputPath) await vc().shell.openPath(job.result.outputPath);
  }
  async revealOutput(job: RenderJob) {
    if (job.result?.outputPath) await vc().shell.revealInFolder(job.result.outputPath);
  }
}

/** TtsClient over IPC: Piper runs in the main process; cloud keys live in the OS keychain. */
export class DesktopTtsClient implements TtsClient {
  providers(): Promise<TtsProviderInfo[]> {
    return vc().tts.providers() as Promise<TtsProviderInfo[]>;
  }
  listVoices(provider: TtsProviderId): Promise<TtsVoice[]> {
    return vc().tts.voices(provider) as Promise<TtsVoice[]>;
  }
  async synthesize(req: SynthesizeRequest): Promise<Blob> {
    const { bytes, mimeType } = await vc().tts.synthesize(req);
    return new Blob([bytes as BlobPart], { type: mimeType });
  }
  setApiKey(provider: CloudTtsProviderId, key: string) {
    return vc().secrets.set(provider, key);
  }
  hasApiKey(provider: CloudTtsProviderId) {
    return vc().secrets.has(provider);
  }
  async installVoice(voiceId: string, onProgress?: (p: InstallProgress) => void) {
    const off = vc().tts.onInstallProgress((p) => {
      if (p.voiceId === voiceId) onProgress?.(p as InstallProgress);
    });
    try {
      await vc().tts.installVoice(voiceId);
    } finally {
      off();
    }
  }
  removeVoice(voiceId: string) {
    return vc().tts.removeVoice(voiceId);
  }
}
