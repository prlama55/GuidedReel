import type {
  SynthesizeOptions,
  SynthesizedSpeech,
  TTSProvider,
  TtsVoice,
} from '@guidedreel/engine';
import { assertOk, requireKey, type FetchLike } from './http';

export type OpenAiTtsOptions = {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetch?: FetchLike;
};

const VOICES: TtsVoice[] = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
].map((v) => ({
  id: v,
  name: v[0]!.toUpperCase() + v.slice(1),
  languages: ['multilingual'],
  description: 'OpenAI · multilingual',
}));

/** OpenAI speech API (`POST /v1/audio/speech`). Voices are fixed; language follows the text. */
export class OpenAiTtsProvider implements TTSProvider {
  readonly id = 'openai';
  readonly label = 'OpenAI';
  private readonly key: string;
  private readonly model: string;
  private readonly base: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAiTtsOptions) {
    this.key = requireKey('OpenAI', options.apiKey);
    this.model = options.model ?? 'gpt-4o-mini-tts';
    this.base = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.fetchImpl = options.fetch ?? fetch;
  }

  async listVoices(): Promise<TtsVoice[]> {
    return VOICES;
  }

  async synthesize(text: string, options: SynthesizeOptions): Promise<SynthesizedSpeech> {
    const res = await this.fetchImpl(`${this.base}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        voice: options.voiceId,
        input: text,
        response_format: 'wav',
        speed: options.speed ?? 1,
      }),
      signal: options.signal,
    });
    await assertOk(res, 'OpenAI');
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mimeType: 'audio/wav',
      extension: 'wav',
    };
  }
}
