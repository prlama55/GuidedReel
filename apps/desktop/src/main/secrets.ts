import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { safeStorage } from 'electron';
import { createLogger } from '@guidedreel/engine';

const log = createLogger('desktop:secrets', { level: 'info' });

/**
 * API keys encrypted with the OS keychain (Electron safeStorage) and kept in
 * userData/secrets.json. The renderer can store, test for and clear a key but
 * never reads it back; main uses it when calling a provider.
 */
export class SecretStore {
  private readonly file: string;
  private cache: Record<string, string> | null = null;

  constructor(userDataDir: string) {
    this.file = path.join(userDataDir, 'secrets.json');
  }

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await readFile(this.file, 'utf8')) as Record<string, string>;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  async set(name: string, value: string): Promise<void> {
    const all = await this.load();
    if (!value) delete all[name];
    else {
      if (!safeStorage.isEncryptionAvailable())
        log.warn('OS encryption unavailable; storing key obfuscated only');
      all[name] = safeStorage.isEncryptionAvailable()
        ? safeStorage.encryptString(value).toString('base64')
        : `plain:${Buffer.from(value).toString('base64')}`;
    }
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(all), { mode: 0o600 });
  }

  async get(name: string): Promise<string | undefined> {
    const raw = (await this.load())[name];
    if (!raw) return undefined;
    if (raw.startsWith('plain:')) return Buffer.from(raw.slice(6), 'base64').toString('utf8');
    try {
      return safeStorage.decryptString(Buffer.from(raw, 'base64'));
    } catch (err) {
      log.error('could not decrypt secret', { name, error: String(err) });
      return undefined;
    }
  }

  async has(name: string): Promise<boolean> {
    return Boolean((await this.load())[name]);
  }
}
