import type { TtsVoice } from '@guidedreel/engine';
import { CLOUD_TTS_PROVIDERS, type CloudTtsProviderId } from '@guidedreel/providers';
import {
  apiKeyStore,
  type SynthesizeRequest,
  type TtsClient,
  type TtsProviderId,
  type TtsProviderInfo,
} from './client';

type ErrorBody = { error?: { message?: string } } | null;

/**
 * Web implementation: keys live in this browser's localStorage and are sent
 * with each request to our own API, which proxies to the provider and never
 * stores them. There is no local engine on the web.
 */
export class HttpTtsClient implements TtsClient {
  constructor(private readonly baseUrl = '/api/tts') {}

  async providers(): Promise<TtsProviderInfo[]> {
    return CLOUD_TTS_PROVIDERS.map((p) => {
      const has = Boolean(apiKeyStore.get(p.id));
      return {
        id: p.id,
        label: p.label,
        kind: 'cloud',
        available: has,
        reason: has ? undefined : 'Add your API key in Settings',
        keyHint: p.keyHint,
        docsUrl: p.docsUrl,
      };
    });
  }

  async listVoices(provider: TtsProviderId): Promise<TtsVoice[]> {
    const res = await fetch(`${this.baseUrl}/voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: apiKeyStore.get(provider) }),
    });
    if (!res.ok)
      throw new Error(
        ((await res.json().catch(() => null)) as ErrorBody)?.error?.message ??
          `Could not load voices (${res.status})`,
      );
    return (await res.json()) as TtsVoice[];
  }

  async synthesize(req: SynthesizeRequest, signal?: AbortSignal): Promise<Blob> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, apiKey: apiKeyStore.get(req.provider) }),
      signal,
    });
    if (!res.ok)
      throw new Error(
        ((await res.json().catch(() => null)) as ErrorBody)?.error?.message ??
          `Speech generation failed (${res.status})`,
      );
    return res.blob();
  }

  async setApiKey(provider: CloudTtsProviderId, key: string): Promise<void> {
    apiKeyStore.set(provider, key);
  }
  async hasApiKey(provider: CloudTtsProviderId): Promise<boolean> {
    return Boolean(apiKeyStore.get(provider));
  }
}
