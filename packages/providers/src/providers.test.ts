import { describe, expect, it, vi } from 'vitest';
import { ElevenLabsTtsProvider } from './elevenlabs-tts';
import { GoogleTtsProvider, base64ToBytes, languageFromVoiceName } from './google-tts';
import { OpenAiTtsProvider } from './openai-tts';
import { PIPER_VOICES, localEngineUrl, localVoiceArchiveUrl } from './piper-catalog';
import { createCloudTtsProvider } from './index';

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const okBytes = (bytes: number[], type: string) =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { 'Content-Type': type } });

describe('OpenAI TTS', () => {
  it('posts the speech request with the bearer key and returns WAV bytes', async () => {
    const fetchMock = vi.fn(async () => okBytes([82, 73, 70, 70], 'audio/wav'));
    const p = new OpenAiTtsProvider({
      apiKey: 'sk-test',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const out = await p.synthesize('Hello', { voiceId: 'alloy', speed: 1.1 });
    expect(out.extension).toBe('wav');
    expect(Array.from(out.bytes)).toEqual([82, 73, 70, 70]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/audio/speech');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toMatchObject({
      voice: 'alloy',
      input: 'Hello',
      response_format: 'wav',
      speed: 1.1,
    });
    expect((await p.listVoices()).length).toBeGreaterThan(5);
  });
  it('surfaces API errors with the provider message', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'Incorrect API key' } }), { status: 401 }),
    );
    const p = new OpenAiTtsProvider({ apiKey: 'bad', fetch: fetchMock as unknown as typeof fetch });
    await expect(p.synthesize('x', { voiceId: 'alloy' })).rejects.toThrow(
      /OpenAI: 401 – Incorrect API key/,
    );
  });
  it('requires a key', () => {
    expect(() => new OpenAiTtsProvider({ apiKey: ' ' })).toThrow(/API key/);
  });
});

describe('ElevenLabs TTS', () => {
  it('lists voices and synthesises mp3', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/voices')
        ? okJson({
            voices: [
              {
                voice_id: 'v1',
                name: 'Rachel',
                labels: { language: 'en', gender: 'female', accent: 'american' },
              },
            ],
          })
        : okBytes([1, 2, 3], 'audio/mpeg'),
    );
    const p = new ElevenLabsTtsProvider({
      apiKey: 'xi',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const voices = await p.listVoices();
    expect(voices[0]).toMatchObject({ id: 'v1', name: 'Rachel', gender: 'female' });
    const out = await p.synthesize('Hi', { voiceId: 'v1' });
    expect(out.extension).toBe('mp3');
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toContain('/text-to-speech/v1?output_format=mp3_44100_128');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('xi');
  });
});

describe('Google TTS', () => {
  it('lists voices and decodes base64 LINEAR16 audio', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/voices')
        ? okJson({
            voices: [{ name: 'ne-NP-Standard-A', languageCodes: ['ne-NP'], ssmlGender: 'FEMALE' }],
          })
        : okJson({ audioContent: btoa('RIFF') }),
    );
    const p = new GoogleTtsProvider({
      apiKey: 'AIza',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const voices = await p.listVoices();
    expect(voices[0]).toMatchObject({
      id: 'ne-NP-Standard-A',
      languages: ['ne-NP'],
      gender: 'female',
    });
    const out = await p.synthesize('नमस्ते', { voiceId: 'ne-NP-Standard-A' });
    expect(String.fromCharCode(...out.bytes)).toBe('RIFF');
    const [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).voice).toEqual({
      languageCode: 'ne-NP',
      name: 'ne-NP-Standard-A',
    });
    expect(languageFromVoiceName('en-GB-Neural2-B')).toBe('en-GB');
    expect(Array.from(base64ToBytes('AAE='))).toEqual([0, 1]);
  });
});

describe('Local voice catalogue', () => {
  it('builds voice and engine URLs', () => {
    expect(localVoiceArchiveUrl('ne_NP-google-medium')).toBe(
      'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-ne_NP-google-medium.tar.bz2',
    );
    expect(localEngineUrl('darwin', 'arm64')).toContain('osx-universal2-shared.tar.bz2');
    expect(localEngineUrl('win32', 'x64')).toContain('win-x64-shared-MD-Release.tar.bz2');
    expect(localEngineUrl('linux', 'arm64')).toContain('linux-aarch64-shared-cpu.tar.bz2');
    expect(PIPER_VOICES.some((v) => v.language === 'ne-NP')).toBe(true);
  });
  it('factory returns providers by id', () => {
    expect(createCloudTtsProvider('google', 'k').id).toBe('google');
  });
});
