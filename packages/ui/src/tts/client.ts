import type { TtsVoice } from '@guidedreel/engine';
import type { CloudTtsProviderId } from '@guidedreel/providers';

export type TtsProviderId = CloudTtsProviderId | 'local';

export type TtsProviderInfo = {
  id: TtsProviderId;
  label: string;
  /** Cloud providers need a user-supplied key; local needs an installed engine. */
  kind: 'cloud' | 'local';
  /** Ready to synthesise: key present (cloud) or engine installable (local). */
  available: boolean;
  /** Why it is not available, for the UI. */
  reason?: string;
  keyHint?: string;
  docsUrl?: string;
};

export type SynthesizeRequest = {
  provider: TtsProviderId;
  voiceId: string;
  text: string;
  speed?: number;
  language?: string;
};

export type LocalVoiceStatus = TtsVoice & { installed: boolean; sizeMb?: number };

export type InstallProgress = {
  voiceId: string;
  phase: 'engine' | 'voice' | 'done' | 'error';
  progress: number;
  message?: string;
};

/**
 * How the UI talks to text-to-speech. Web: HTTP routes that proxy to cloud
 * providers with the key the user stored in this browser. Desktop: IPC to the
 * main process, which runs Piper locally or calls the cloud with a key kept in
 * the OS keychain. Same dialog either way.
 */
export interface TtsClient {
  providers(): Promise<TtsProviderInfo[]>;
  listVoices(provider: TtsProviderId): Promise<TtsVoice[]>;
  synthesize(req: SynthesizeRequest, signal?: AbortSignal): Promise<Blob>;
  /** Store (or clear with an empty string) a cloud API key. */
  setApiKey(provider: CloudTtsProviderId, key: string): Promise<void>;
  hasApiKey(provider: CloudTtsProviderId): Promise<boolean>;
  /** Local engine only. */
  installVoice?(voiceId: string, onProgress?: (p: InstallProgress) => void): Promise<void>;
  removeVoice?(voiceId: string): Promise<void>;
}

/** Browser-side key storage helper used by the web implementation (localStorage). */
export const apiKeyStore = {
  key: (provider: string) => `vc:apiKey:${provider}`,
  get(provider: string): string | null {
    try {
      return localStorage.getItem(this.key(provider));
    } catch {
      return null;
    }
  },
  set(provider: string, value: string): void {
    try {
      if (value) localStorage.setItem(this.key(provider), value);
      else localStorage.removeItem(this.key(provider));
    } catch {
      /* ignore */
    }
  },
};
