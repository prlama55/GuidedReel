import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { DesktopApi, IpcChannel, MenuAction } from '../shared/ipc';
import type { RenderJob } from '@guidedreel/schema';

/** Only the typed `window.vc` surface is exposed; no raw ipcRenderer, fs or Node. */
const invoke = <T>(channel: IpcChannel, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args).catch((err: Error) => {
    // Main serializes VideoCreatorError as JSON in the message; surface it cleanly.
    try {
      const parsed = JSON.parse(
        err.message.replace(/^Error invoking remote method '[^']+': Error: /, ''),
      ) as { code: string; message: string };
      const e = new Error(parsed.message) as Error & { code?: string };
      e.code = parsed.code;
      throw e;
    } catch (inner) {
      if (inner instanceof Error && 'code' in inner) throw inner;
      throw err;
    }
  });

const api: DesktopApi = {
  projects: {
    list: () => invoke('projects:list'),
    get: (id) => invoke('projects:get', id),
    save: (project) => invoke('projects:save', project),
    delete: (id) => invoke('projects:delete', id),
  },
  assets: {
    put: (key, bytes, meta) => invoke('assets:put', key, bytes, meta),
    getMeta: (key) => invoke('assets:getMeta', key),
    delete: (key) => invoke('assets:delete', key),
    list: () => invoke('assets:list'),
    allowLocal: (paths) => invoke('assets:allowLocal', paths),
  },
  dialog: {
    pickFiles: (options) => invoke('dialog:pickFiles', options),
    saveFile: (options, bytes) => invoke('dialog:saveFile', options, bytes),
    chooseOutput: (name, extension) => invoke('dialog:chooseOutput', name, extension),
  },
  shell: {
    openExternal: (url) => invoke('shell:openExternal', url),
    revealInFolder: (p) => invoke('shell:revealInFolder', p),
    openPath: (p) => invoke('shell:openPath', p),
  },
  render: {
    start: (project, options, outputPath) => invoke('render:start', project, options, outputPath),
    get: (id) => invoke('render:get', id),
    list: () => invoke('render:list'),
    cancel: (id) => invoke('render:cancel', id),
    remove: (id) => invoke('render:remove', id),
    onUpdate: (cb) => {
      const listener = (_e: unknown, job: RenderJob) => cb(job);
      ipcRenderer.on('render:update', listener);
      return () => ipcRenderer.removeListener('render:update', listener);
    },
  },
  app: {
    setDocumentEdited: (edited) => invoke('app:setDocumentEdited', edited),
    getInfo: () => invoke('app:getInfo'),
    onMenuAction: (cb) => {
      const listener = (_e: unknown, action: MenuAction) => cb(action);
      ipcRenderer.on('menu:action', listener);
      return () => ipcRenderer.removeListener('menu:action', listener);
    },
  },
  tts: {
    providers: () => invoke('tts:providers'),
    voices: (provider) => invoke('tts:voices', provider),
    synthesize: (req) => invoke('tts:synthesize', req),
    installVoice: (voiceId) => invoke('tts:installVoice', voiceId),
    removeVoice: (voiceId) => invoke('tts:removeVoice', voiceId),
    onInstallProgress: (cb) => {
      const listener = (
        _e: unknown,
        p: { voiceId: string; phase: string; progress: number; message?: string },
      ) => cb(p);
      ipcRenderer.on('tts:progress', listener);
      return () => ipcRenderer.removeListener('tts:progress', listener);
    },
  },
  secrets: {
    set: (name, value) => invoke('secrets:set', name, value),
    has: (name) => invoke('secrets:has', name),
  },
  getPathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld('vc', api);
