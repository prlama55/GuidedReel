import type {
  SynthesizeOptions,
  SynthesizedSpeech,
  TTSProvider,
  TtsVoice,
} from '@guidedreel/engine';
import { assertOk, requireKey, type FetchLike } from './http';

export type GoogleTtsOptions = { apiKey: string; baseUrl?: string; fetch?: FetchLike };

type VoicesResponse = { voices?: { name: string; languageCodes: string[]; ssmlGender?: string }[] };

/** Google Cloud Text-to-Speech REST API with an API key. Supports Nepali (ne-NP) and 50+ languages. */
export class GoogleTtsProvider implements TTSProvider {
  readonly id = 'google';
  readonly label = 'Google Cloud';
  private readonly key: string;
  private readonly base: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: GoogleTtsOptions) {
    this.key = requireKey('Google Cloud TTS', options.apiKey);
    this.base = (options.baseUrl ?? 'https://texttospeech.googleapis.com/v1').replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? fetch;
  }

  async listVoices(options: { signal?: AbortSignal } = {}): Promise<TtsVoice[]> {
    const res = await this.fetchImpl(`${this.base}/voices`, {
      headers: { 'x-goog-api-key': this.key },
      signal: options.signal,
    });
    await assertOk(res, 'Google Cloud TTS');
    const json = (await res.json()) as VoicesResponse;
    return (json.voices ?? [])
      .map((v) => ({
        id: v.name,
        name: v.name,
        languages: v.languageCodes,
        gender:
          v.ssmlGender === 'MALE'
            ? ('male' as const)
            : v.ssmlGender === 'FEMALE'
              ? ('female' as const)
              : ('neutral' as const),
        description: /Neural2|Wavenet|Studio|Journey|Chirp/.exec(v.name)?.[0],
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async synthesize(text: string, options: SynthesizeOptions): Promise<SynthesizedSpeech> {
    const languageCode = options.language ?? languageFromVoiceName(options.voiceId) ?? 'en-US';
    const res = await this.fetchImpl(`${this.base}/text:synthesize`, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: options.voiceId },
        audioConfig: { audioEncoding: 'LINEAR16', speakingRate: options.speed ?? 1 },
      }),
      signal: options.signal,
    });
    await assertOk(res, 'Google Cloud TTS');
    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) throw new Error('Google Cloud TTS returned no audio');
    return { bytes: base64ToBytes(json.audioContent), mimeType: 'audio/wav', extension: 'wav' };
  }
}

/** Google voice names start with the language code, e.g. "ne-NP-Standard-A". */
export function languageFromVoiceName(name: string): string | undefined {
  const m = /^([a-z]{2,3}-[A-Z]{2})-/.exec(name);
  return m?.[1];
}

export function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node without atob (older runtimes)
  return new Uint8Array(
    (globalThis as unknown as { Buffer: { from(s: string, e: string): Uint8Array } }).Buffer.from(
      b64,
      'base64',
    ),
  );
}
