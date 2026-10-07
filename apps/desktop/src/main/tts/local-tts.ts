import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { SynthesizeOptions, SynthesizedSpeech, TTSProvider, TtsVoice } from '@guidedreel/core';
import { VideoCreatorError, createLogger } from '@guidedreel/core';
import {
  PIPER_VOICES,
  localEngineUrl,
  localVoiceArchiveUrl,
  type LocalTtsArch,
  type LocalTtsPlatform,
} from '@guidedreel/core/providers';

const log = createLogger('desktop:tts', { level: 'info' });

export type InstallProgress = {
  voiceId: string;
  phase: 'engine' | 'voice' | 'done' | 'error';
  progress: number;
  message?: string;
};

/**
 * Local text-to-speech: Piper voices run by the sherpa-onnx CLI. The engine
 * (~20–45 MB) and each voice (~20–75 MB) are downloaded on demand into
 * userData/tts and executed as a child process; nothing leaves the machine.
 */
export class LocalTtsEngine implements TTSProvider {
  readonly id = 'local';
  readonly label = 'Local (Piper voices)';
  private readonly root: string;

  constructor(userDataDir: string) {
    this.root = path.join(userDataDir, 'tts');
  }

  get supported(): boolean {
    return (
      localEngineUrl(process.platform as LocalTtsPlatform, process.arch as LocalTtsArch) !== null
    );
  }

  private get engineDir() {
    return path.join(this.root, 'engine');
  }
  private get voicesDir() {
    return path.join(this.root, 'voices');
  }
  private get binary() {
    return path.join(
      this.engineDir,
      'bin',
      process.platform === 'win32' ? 'sherpa-onnx-offline-tts.exe' : 'sherpa-onnx-offline-tts',
    );
  }

  async engineInstalled(): Promise<boolean> {
    return stat(this.binary)
      .then((s) => s.isFile())
      .catch(() => false);
  }

  private voiceDir(voiceId: string) {
    return path.join(this.voicesDir, path.basename(voiceId));
  }

  async voiceInstalled(voiceId: string): Promise<boolean> {
    const dir = this.voiceDir(voiceId);
    const [model, tokens] = await Promise.all([
      stat(path.join(dir, `${voiceId}.onnx`)).catch(() => null),
      stat(path.join(dir, 'tokens.txt')).catch(() => null),
    ]);
    return Boolean(model?.isFile() && tokens?.isFile());
  }

  async listVoices(): Promise<TtsVoice[]> {
    const installed = new Set(await readdir(this.voicesDir).catch(() => [] as string[]));
    return PIPER_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      languages: [v.language],
      gender: v.gender,
      description: `${v.languageName} · ${v.quality.replace('_', ' ')} quality · ${v.sizeMb} MB`,
      installed: installed.has(v.id),
    }));
  }

  async installVoice(voiceId: string, onProgress?: (p: InstallProgress) => void): Promise<void> {
    if (!PIPER_VOICES.some((v) => v.id === voiceId))
      throw new VideoCreatorError('NOT_FOUND', `Unknown voice "${voiceId}"`);
    if (!(await this.engineInstalled()))
      await this.installEngine((p, m) =>
        onProgress?.({ voiceId, phase: 'engine', progress: p, message: m }),
      );
    await mkdir(this.voicesDir, { recursive: true });
    const archive = path.join(this.voicesDir, `${voiceId}.tar.bz2`);
    await download(localVoiceArchiveUrl(voiceId), archive, (p) =>
      onProgress?.({ voiceId, phase: 'voice', progress: p * 0.95, message: 'Downloading voice' }),
    );
    onProgress?.({ voiceId, phase: 'voice', progress: 0.97, message: 'Unpacking voice' });
    // Archive root folder is vits-piper-<id>/ → extract then rename to <id>/
    await rm(path.join(this.voicesDir, `vits-piper-${voiceId}`), { recursive: true, force: true });
    await run('tar', ['-xjf', archive, '-C', this.voicesDir]);
    await rm(this.voiceDir(voiceId), { recursive: true, force: true });
    await rename(path.join(this.voicesDir, `vits-piper-${voiceId}`), this.voiceDir(voiceId));
    await rm(archive, { force: true });
    if (!(await this.voiceInstalled(voiceId)))
      throw new VideoCreatorError('IO_ERROR', 'Voice did not unpack correctly');
    onProgress?.({ voiceId, phase: 'done', progress: 1 });
    log.info('voice installed', { voiceId });
  }

  async removeVoice(voiceId: string): Promise<void> {
    await rm(this.voiceDir(voiceId), { recursive: true, force: true });
  }

  async installEngine(onProgress?: (p: number, message: string) => void): Promise<void> {
    const url = localEngineUrl(process.platform as LocalTtsPlatform, process.arch as LocalTtsArch);
    if (!url)
      throw new VideoCreatorError(
        'UNSUPPORTED_MEDIA',
        `Local voices are not available on ${process.platform}/${process.arch}`,
      );
    await mkdir(this.root, { recursive: true });
    const archive = path.join(this.root, 'engine.tar.bz2');
    await download(url, archive, (p) => onProgress?.(p * 0.9, 'Downloading speech engine'));
    onProgress?.(0.92, 'Unpacking speech engine');
    await rm(this.engineDir, { recursive: true, force: true });
    await mkdir(this.engineDir, { recursive: true });
    await run('tar', ['-xjf', archive, '-C', this.engineDir, '--strip-components=1']);
    await rm(archive, { force: true });
    if (!(await this.engineInstalled()))
      throw new VideoCreatorError('IO_ERROR', 'Speech engine did not unpack correctly');
    onProgress?.(1, 'Engine ready');
    log.info('local tts engine installed', { binary: this.binary });
  }

  async synthesize(text: string, options: SynthesizeOptions): Promise<SynthesizedSpeech> {
    if (!(await this.voiceInstalled(options.voiceId)))
      throw new VideoCreatorError('NOT_FOUND', `Voice "${options.voiceId}" is not installed`);
    const dir = this.voiceDir(options.voiceId);
    const out = path.join(
      os.tmpdir(),
      `vc-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
    );
    const args = [
      `--vits-model=${path.join(dir, `${options.voiceId}.onnx`)}`,
      `--vits-tokens=${path.join(dir, 'tokens.txt')}`,
      `--vits-data-dir=${path.join(dir, 'espeak-ng-data')}`,
      `--vits-length-scale=${(1 / (options.speed ?? 1)).toFixed(3)}`,
      `--output-filename=${out}`,
      text,
    ];
    await run(this.binary, args, options.signal, {
      cwd: path.dirname(this.binary),
      env: { ...process.env, LD_LIBRARY_PATH: path.join(this.engineDir, 'lib') },
    });
    const bytes = new Uint8Array(await readFile(out));
    await rm(out, { force: true });
    return { bytes, mimeType: 'audio/wav', extension: 'wav' };
  }
}

async function download(
  url: string,
  dest: string,
  onProgress?: (p: number) => void,
): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body)
    throw new VideoCreatorError('IO_ERROR', `Download failed (${res.status}) for ${url}`);
  const total = Number(res.headers.get('content-length') ?? 0);
  let received = 0;
  const tmp = `${dest}.part`;
  const reader = res.body.getReader();
  const stream = new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) return this.push(null);
      received += value.byteLength;
      if (total) onProgress?.(received / total);
      this.push(Buffer.from(value));
    },
  });
  await pipeline(stream, createWriteStream(tmp));
  await rename(tmp, dest);
  onProgress?.(1);
}

function run(
  cmd: string,
  args: string[],
  signal?: AbortSignal,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      cwd: options.cwd,
      env: options.env ?? process.env,
    });
    let stderr = '';
    child.stderr?.on('data', (d) => (stderr += String(d)));
    const onAbort = () => child.kill();
    signal?.addEventListener('abort', onAbort, { once: true });
    child.on('error', reject);
    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (signal?.aborted) return reject(new VideoCreatorError('RENDER_CANCELLED', 'Cancelled'));
      if (code === 0) resolve();
      else
        reject(
          new VideoCreatorError(
            'IO_ERROR',
            `${path.basename(cmd)} exited with code ${code}${stderr ? `: ${stderr.trim().split('\n').slice(-3).join(' ')}` : ''}`,
          ),
        );
    });
  });
}
