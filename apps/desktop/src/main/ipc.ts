import path from 'node:path';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import { ACCEPTED_MIME_TYPES, type AssetType } from '@guidedreel/schema';
import { createLogger, serializeError } from '@guidedreel/engine';
import { mimeFromPath } from '@guidedreel/renderer';
import { IPC, type IpcChannel } from '../shared/ipc';
import type { FileAssetStore, FileProjectRepository } from './storage';
import type { AssetProtocol } from './protocol';
import type { RenderManager } from './render-manager';
import type { LocalTtsEngine } from './tts/local-tts';
import type { SecretStore } from './secrets';
import { APP_VERSION } from './app-info';
import {
  CLOUD_TTS_PROVIDERS,
  createCloudTtsProvider,
  type CloudTtsProviderId,
} from '@guidedreel/providers';

const log = createLogger('desktop:ipc', { level: 'info' });

const EXTENSIONS: Record<AssetType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
  logo: ['png', 'svg', 'jpg', 'jpeg', 'webp'],
  video: ['mp4', 'mov', 'webm', 'm4v'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  voiceover: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  music: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  font: ['ttf', 'otf', 'woff', 'woff2'],
};

type Deps = {
  projects: FileProjectRepository;
  assets: FileAssetStore;
  protocol: AssetProtocol;
  render: RenderManager;
  piper: LocalTtsEngine;
  secrets: SecretStore;
  getWindow: () => BrowserWindow | null;
};

/** Registers every IPC handler with argument validation. Unknown channels are never exposed. */
export function registerIpc(deps: Deps): void {
  const handle = <C extends IpcChannel>(
    channel: C,
    fn: (...args: unknown[]) => Promise<unknown>,
  ) => {
    ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
      const parsed = IPC[channel].args.safeParse(args);
      if (!parsed.success) {
        log.warn('rejected IPC call', { channel, issue: parsed.error.issues[0]?.message });
        throw new Error(`Invalid arguments for ${channel}`);
      }
      try {
        return await fn(...(parsed.data as unknown[]));
      } catch (err) {
        const s = serializeError(err);
        log.error('IPC handler failed', { channel, code: s.code, message: s.message });
        throw new Error(JSON.stringify(s), { cause: err });
      }
    });
  };

  handle('projects:list', () => deps.projects.list());
  handle('projects:get', async (id) => {
    const project = await deps.projects.get(id as string);
    if (project)
      deps.protocol.allowLocal(
        project.assets.flatMap((a) => (a.source.kind === 'local' ? [a.source.path] : [])),
      );
    return project;
  });
  handle('projects:save', async (project) => {
    const p = project as Parameters<FileProjectRepository['save']>[0];
    deps.protocol.allowLocal(
      p.assets.flatMap((a) => (a.source.kind === 'local' ? [a.source.path] : [])),
    );
    await deps.projects.save(p);
  });
  handle('projects:delete', (id) => deps.projects.delete(id as string));

  handle('assets:put', (key, bytes, meta) =>
    deps.assets.put(
      key as string,
      bytes as Uint8Array,
      meta as Parameters<FileAssetStore['put']>[2],
    ),
  );
  handle('assets:getMeta', (key) => deps.assets.getMeta(key as string));
  handle('assets:delete', (key) => deps.assets.delete(key as string));
  handle('assets:list', () => deps.assets.list());
  handle('assets:allowLocal', async (paths) => {
    // Only files the renderer legitimately knows about (dropped from the OS). Verify they exist.
    const ok: string[] = [];
    for (const p of paths as string[])
      if (
        await stat(p)
          .then((s) => s.isFile())
          .catch(() => false)
      )
        ok.push(p);
    deps.protocol.allowLocal(ok);
  });

  handle('dialog:pickFiles', async (options) => {
    const opts = (options ?? {}) as { multiple?: boolean; assetTypes?: AssetType[] };
    const win = deps.getWindow();
    const types = opts.assetTypes?.length
      ? opts.assetTypes
      : (Object.keys(EXTENSIONS) as AssetType[]);
    const extensions = [...new Set(types.flatMap((t) => EXTENSIONS[t]))];
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      properties: ['openFile', ...(opts.multiple === false ? [] : ['multiSelections' as const])],
      filters: [
        { name: 'Media', extensions },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    deps.protocol.allowLocal(result.filePaths);
    const files = [];
    for (const p of result.filePaths) {
      const s = await stat(p);
      files.push({ name: path.basename(p), size: s.size, mimeType: mimeFromPath(p), path: p });
    }
    return files;
  });
  handle('dialog:saveFile', async (options, bytes) => {
    const o = options as {
      suggestedName: string;
      filters?: { name: string; extensions: string[] }[];
    };
    const result = await dialog.showSaveDialog(deps.getWindow() ?? undefined!, {
      defaultPath: path.join(app.getPath('documents'), o.suggestedName),
      filters: o.filters,
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, bytes as Uint8Array);
    return result.filePath;
  });
  handle('dialog:chooseOutput', async (suggestedName, extension) => {
    // Automation hook: Playwright cannot drive native dialogs.
    const e2eDir = process.env['VC_E2E_OUTPUT_DIR'];
    if (e2eDir) return path.join(e2eDir, `${suggestedName}.${extension}`);
    const result = await dialog.showSaveDialog(deps.getWindow() ?? undefined!, {
      title: 'Export video',
      defaultPath: path.join(app.getPath('videos'), `${suggestedName}.${extension}`),
      filters: [{ name: 'Video', extensions: [extension as string] }],
    });
    return result.canceled ? null : (result.filePath ?? null);
  });

  handle('shell:openExternal', async (url) => {
    const u = new URL(url as string);
    if (u.protocol !== 'https:' && u.protocol !== 'http:')
      throw new Error('Only http(s) links can be opened');
    await shell.openExternal(u.toString());
  });
  handle('shell:revealInFolder', async (p) => shell.showItemInFolder(p as string));
  handle('shell:openPath', async (p) => {
    const err = await shell.openPath(p as string);
    if (err) throw new Error(err);
  });

  handle('render:start', (project, options, outputPath) =>
    deps.render.start(
      project as Parameters<RenderManager['start']>[0],
      options as Parameters<RenderManager['start']>[1],
      outputPath as string | undefined,
    ),
  );
  handle('render:get', async (id) => deps.render.get(id as string));
  handle('render:list', async () => deps.render.list());
  handle('render:cancel', async (id) => deps.render.cancel(id as string));
  handle('render:remove', async (id) => deps.render.remove(id as string));

  // ---- text-to-speech: local Piper + cloud providers with keys from the OS keychain ----
  const isCloud = (id: string): id is CloudTtsProviderId =>
    CLOUD_TTS_PROVIDERS.some((p) => p.id === id);
  const cloudProvider = async (id: CloudTtsProviderId) => {
    const key = await deps.secrets.get(`tts:${id}`);
    if (!key) throw new Error(`No API key saved for ${id}. Add it in Settings.`);
    return createCloudTtsProvider(id, key);
  };
  handle('tts:providers', async () => {
    const cloud = await Promise.all(
      CLOUD_TTS_PROVIDERS.map(async (p) => ({
        id: p.id,
        label: p.label,
        kind: 'cloud' as const,
        available: await deps.secrets.has(`tts:${p.id}`),
        reason: (await deps.secrets.has(`tts:${p.id}`))
          ? undefined
          : 'Add your API key in Settings',
        keyHint: p.keyHint,
        docsUrl: p.docsUrl,
      })),
    );
    return [
      {
        id: 'local',
        label: 'Local (Piper voices, offline)',
        kind: 'local' as const,
        available: deps.piper.supported,
        reason: deps.piper.supported ? undefined : 'Not available on this platform',
      },
      ...cloud,
    ];
  });
  handle('tts:voices', async (provider) =>
    provider === 'local'
      ? deps.piper.listVoices()
      : isCloud(provider as string)
        ? (await cloudProvider(provider as CloudTtsProviderId)).listVoices()
        : [],
  );
  handle('tts:synthesize', async (req) => {
    const r = req as {
      provider: string;
      voiceId: string;
      text: string;
      speed?: number;
      language?: string;
    };
    const provider =
      r.provider === 'local'
        ? deps.piper
        : isCloud(r.provider)
          ? await cloudProvider(r.provider)
          : null;
    if (!provider) throw new Error(`Unknown provider ${r.provider}`);
    const speech = await provider.synthesize(r.text, {
      voiceId: r.voiceId,
      speed: r.speed,
      language: r.language,
    });
    return { bytes: speech.bytes, mimeType: speech.mimeType };
  });
  handle('tts:installVoice', (voiceId) =>
    deps.piper.installVoice(voiceId as string, (p) =>
      deps.getWindow()?.webContents.send('tts:progress', p),
    ),
  );
  handle('tts:removeVoice', (voiceId) => deps.piper.removeVoice(voiceId as string));
  handle('secrets:set', (name, value) =>
    deps.secrets.set(`tts:${name as string}`, value as string),
  );
  handle('secrets:has', (name) => deps.secrets.has(`tts:${name as string}`));

  handle('app:setDocumentEdited', async (edited) =>
    deps.getWindow()?.setDocumentEdited(edited as boolean),
  );
  handle('app:getInfo', async () => ({
    version: APP_VERSION,
    platform: process.platform,
    userDataPath: app.getPath('userData'),
  }));

  void readFile;
  void ACCEPTED_MIME_TYPES;
}
