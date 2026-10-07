/**
 * Browser-side audio utilities: decode a recording, trim leading/trailing
 * silence and encode 16-bit PCM WAV. WAV is used for recordings so Safari,
 * the Remotion renderer and the desktop app all handle the file identically.
 */

export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]!;
  const length = channels[0]?.length ?? 0;
  const out = new Float32Array(length);
  for (const ch of channels) for (let i = 0; i < length; i++) out[i]! += ch[i]! / channels.length;
  return out;
}

export type TrimOptions = {
  /** Linear amplitude threshold (0..1) below which audio counts as silence. */
  threshold?: number;
  /** Silence kept before/after the detected speech, in milliseconds. */
  paddingMs?: number;
  /** Analysis window in milliseconds. */
  windowMs?: number;
};

/** Removes leading and trailing silence; returns the input when it is entirely silent. */
export function trimSilence(
  samples: Float32Array,
  sampleRate: number,
  { threshold = 0.02, paddingMs = 150, windowMs = 10 }: TrimOptions = {},
): Float32Array {
  const win = Math.max(1, Math.round((sampleRate * windowMs) / 1000));
  const rmsAt = (start: number) => {
    let sum = 0;
    const end = Math.min(samples.length, start + win);
    for (let i = start; i < end; i++) sum += samples[i]! * samples[i]!;
    return Math.sqrt(sum / Math.max(1, end - start));
  };
  let first = -1;
  let last = -1;
  for (let i = 0; i < samples.length; i += win) {
    if (rmsAt(i) >= threshold) {
      if (first === -1) first = i;
      last = Math.min(samples.length, i + win);
    }
  }
  if (first === -1) return samples;
  const pad = Math.round((sampleRate * paddingMs) / 1000);
  const start = Math.max(0, first - pad);
  const end = Math.min(samples.length, last + pad);
  return samples.slice(start, end);
}

/** Peak-normalises to `peak` (default -1 dBFS) without clipping; silent input is returned unchanged. */
export function normalize(samples: Float32Array, peak = 0.89): Float32Array {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]!));
  if (max === 0 || max >= peak) return samples;
  const gain = peak / max;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i]! * gain;
  return out;
}

/** 16-bit PCM WAV encoder (mono or multi-channel interleaved). */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = channels.length;
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Reads the sample rate, channel count and duration from a WAV header. */
export function readWavHeader(buffer: ArrayBuffer): {
  sampleRate: number;
  channels: number;
  durationSeconds: number;
} {
  const view = new DataView(buffer);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const dataSize = view.getUint32(40, true);
  return { sampleRate, channels, durationSeconds: dataSize / (sampleRate * channels * 2) };
}

/** Decodes any browser-supported audio blob to mono samples. */
export async function decodeToMono(
  blob: Blob,
  targetSampleRate = 48_000,
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AudioCtx =
    (
      globalThis as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }
    ).AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio is not available in this environment');
  const ctx = new AudioCtx({ sampleRate: targetSampleRate });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) =>
      decoded.getChannelData(i),
    );
    return { samples: mixToMono(channels), sampleRate: decoded.sampleRate };
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

/** Full pipeline for a microphone take: decode → trim → normalise → WAV. */
export async function finalizeRecording(
  blob: Blob,
): Promise<{ blob: Blob; durationSeconds: number; sampleRate: number }> {
  const { samples, sampleRate } = await decodeToMono(blob);
  const trimmed = normalize(trimSilence(samples, sampleRate));
  return {
    blob: encodeWav([trimmed], sampleRate),
    durationSeconds: trimmed.length / sampleRate,
    sampleRate,
  };
}
