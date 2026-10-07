export * from './http';
export * from './openai-tts';
export * from './elevenlabs-tts';
export * from './google-tts';
export * from './piper-catalog';

import type { TTSProvider } from '@guidedreel/engine';
import { OpenAiTtsProvider } from './openai-tts';
import { ElevenLabsTtsProvider } from './elevenlabs-tts';
import { GoogleTtsProvider } from './google-tts';

export type CloudTtsProviderId = 'openai' | 'elevenlabs' | 'google';
export const CLOUD_TTS_PROVIDERS: {
  id: CloudTtsProviderId;
  label: string;
  keyHint: string;
  docsUrl: string;
}[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    keyHint: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    keyHint: 'xi-api-key',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
  },
  {
    id: 'google',
    label: 'Google Cloud Text-to-Speech',
    keyHint: 'AIza…',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },
];

/** Builds a cloud TTS provider from a user-supplied key. */
export function createCloudTtsProvider(
  id: CloudTtsProviderId,
  apiKey: string,
  fetchImpl?: typeof fetch,
): TTSProvider {
  switch (id) {
    case 'openai':
      return new OpenAiTtsProvider({ apiKey, fetch: fetchImpl });
    case 'elevenlabs':
      return new ElevenLabsTtsProvider({ apiKey, fetch: fetchImpl });
    case 'google':
      return new GoogleTtsProvider({ apiKey, fetch: fetchImpl });
  }
}
