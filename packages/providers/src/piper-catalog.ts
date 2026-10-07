/**
 * Local text-to-speech: Piper voices (VITS ONNX models, ~20–75 MB each) run by
 * the sherpa-onnx engine, which publishes self-contained builds for macOS,
 * Linux and Windows (the upstream Piper macOS binary ships without its
 * libraries). Voice archives include the model, tokens and espeak-ng data.
 * Licences: sherpa-onnx is Apache-2.0; Piper voices are CC BY or public domain
 * (see each voice's MODEL_CARD).
 */

export const LOCAL_TTS_ENGINE_VERSION = 'v1.13.8';

export type PiperVoice = {
  /** e.g. "en_US-lessac-medium" */
  id: string;
  name: string;
  language: string; // BCP-47, e.g. en-US
  languageName: string;
  quality: 'x_low' | 'low' | 'medium' | 'high';
  gender?: 'male' | 'female';
  /** Approximate download size in MB (onnx + json). */
  sizeMb: number;
};

const v = (
  id: string,
  name: string,
  language: string,
  languageName: string,
  quality: PiperVoice['quality'],
  sizeMb: number,
  gender?: PiperVoice['gender'],
): PiperVoice => ({ id, name, language, languageName, quality, sizeMb, gender });

export const PIPER_VOICES: readonly PiperVoice[] = [
  v('en_US-lessac-medium', 'Lessac', 'en-US', 'English (US)', 'medium', 63, 'female'),
  v('en_US-amy-medium', 'Amy', 'en-US', 'English (US)', 'medium', 63, 'female'),
  v('en_US-ryan-high', 'Ryan', 'en-US', 'English (US)', 'high', 115, 'male'),
  v('en_GB-alba-medium', 'Alba', 'en-GB', 'English (UK)', 'medium', 63, 'female'),
  v('ne_NP-google-medium', 'Google (Nepali)', 'ne-NP', 'Nepali', 'medium', 63),
  v('ne_NP-chitwan-medium', 'Chitwan', 'ne-NP', 'Nepali', 'medium', 63),
  v('hi_IN-pratham-medium', 'Pratham', 'hi-IN', 'Hindi', 'medium', 63, 'male'),
  v('es_ES-davefx-medium', 'DaveFX', 'es-ES', 'Spanish (Spain)', 'medium', 63, 'male'),
  v('fr_FR-siwis-medium', 'Siwis', 'fr-FR', 'French', 'medium', 63, 'female'),
  v('de_DE-thorsten-medium', 'Thorsten', 'de-DE', 'German', 'medium', 63, 'male'),
  v('pt_BR-faber-medium', 'Faber', 'pt-BR', 'Portuguese (Brazil)', 'medium', 63, 'male'),
  v('zh_CN-huayan-medium', 'Huayan', 'zh-CN', 'Chinese (Mandarin)', 'medium', 63, 'female'),
  v('it_IT-riccardo-x_low', 'Riccardo', 'it-IT', 'Italian', 'x_low', 28, 'male'),
  v('ar_JO-kareem-medium', 'Kareem', 'ar-JO', 'Arabic', 'medium', 63, 'male'),
  v('ru_RU-irina-medium', 'Irina', 'ru-RU', 'Russian', 'medium', 63, 'female'),
];

export function piperVoiceById(id: string): PiperVoice | undefined {
  return PIPER_VOICES.find((p) => p.id === id);
}

/** Voice archive (model + tokens + espeak-ng-data) for a Piper voice id. */
export function localVoiceArchiveUrl(voiceId: string): string {
  return `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-${voiceId}.tar.bz2`;
}

export type LocalTtsPlatform = 'darwin' | 'linux' | 'win32';
export type LocalTtsArch = 'arm64' | 'x64';

/** Engine release archive for the current platform, or null when unsupported. All are tar.bz2. */
export function localEngineUrl(platform: LocalTtsPlatform, arch: LocalTtsArch): string | null {
  const base = `https://github.com/k2-fsa/sherpa-onnx/releases/download/${LOCAL_TTS_ENGINE_VERSION}/sherpa-onnx-${LOCAL_TTS_ENGINE_VERSION}`;
  if (platform === 'darwin') return `${base}-osx-universal2-shared.tar.bz2`;
  if (platform === 'linux')
    return arch === 'arm64'
      ? `${base}-linux-aarch64-shared-cpu.tar.bz2`
      : `${base}-linux-x64-shared.tar.bz2`;
  if (platform === 'win32')
    return arch === 'arm64'
      ? `${base}-win-arm64-shared-MD-Release.tar.bz2`
      : `${base}-win-x64-shared-MD-Release.tar.bz2`;
  return null;
}

/** @deprecated kept for callers of the previous Piper-binary layout */
export const piperVoiceUrls = (voiceId: string) => ({
  model: localVoiceArchiveUrl(voiceId),
  config: localVoiceArchiveUrl(voiceId),
});
