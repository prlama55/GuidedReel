import type {
  SynthesizeOptions,
  SynthesizedSpeech,
  TTSProvider,
  TtsVoice,
} from '@guidedreel/engine';
import { assertOk, requireKey, type FetchLike } from './http';

export type ElevenLabsTtsOptions = {
  apiKey: string;
  modelId?: string;
  baseUrl?: string;
  fetch?: FetchLike;
};

type VoicesResponse = {
  voices?: {
    voice_id: string;
    name: string;
    labels?: Record<string, string>;
    description?: string;
  }[];
};

/** ElevenLabs text-to-speech (`/v1/voices`, `/v1/text-to-speech/{voice_id}`). */
export class ElevenLabsTtsProvider implements TTSProvider {
  readonly id = 'elevenlabs';
  readonly label = 'ElevenLabs';
  private readonly key: string;
  private readonly modelId: string;
  private readonly base: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: ElevenLabsTtsOptions) {
    this.key = requireKey('ElevenLabs', options.apiKey);
    this.modelId = options.modelId ?? 'eleven_multilingual_v2';
    this.base = (options.baseUrl ?? 'https://api.elevenlabs.io/v1').replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? fetch;
  }

  async listVoices(options: { signal?: AbortSignal } = {}): Promise<TtsVoice[]> {
    const res = await this.fetchImpl(`${this.base}/voices`, {
      headers: { 'xi-api-key': this.key },
      signal: options.signal,
    });
    await assertOk(res, 'ElevenLabs');
    const json = (await res.json()) as VoicesResponse;
    return (json.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      languages: v.labels?.language ? [v.labels.language] : ['multilingual'],
      gender:
        v.labels?.gender === 'male' || v.labels?.gender === 'female' ? v.labels.gender : undefined,
      description:
        [v.labels?.accent, v.labels?.description, v.labels?.use_case].filter(Boolean).join(' · ') ||
        undefined,
    }));
  }

  async synthesize(text: string, options: SynthesizeOptions): Promise<SynthesizedSpeech> {
    const res = await this.fetchImpl(
      `${this.base}/text-to-speech/${encodeURIComponent(options.voiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: options.speed ?? 1 },
        }),
        signal: options.signal,
      },
    );
    await assertOk(res, 'ElevenLabs');
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mimeType: 'audio/mpeg',
      extension: 'mp3',
    };
  }
}
