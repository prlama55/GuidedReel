import { describe, expect, it } from 'vitest';
import { encodeWav, mixToMono, normalize, readWavHeader, trimSilence } from './wav';

const sr = 8000;
const tone = (seconds: number, amp = 0.5) =>
  Float32Array.from(
    { length: Math.round(sr * seconds) },
    (_, i) => amp * Math.sin((2 * Math.PI * 440 * i) / sr),
  );
const silence = (seconds: number) => new Float32Array(Math.round(sr * seconds));
const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

describe('wav utilities', () => {
  it('trims leading and trailing silence but keeps padding', () => {
    const input = concat(silence(1), tone(0.5), silence(1));
    const out = trimSilence(input, sr, { paddingMs: 100 });
    expect(out.length).toBeGreaterThanOrEqual(Math.round(sr * 0.5));
    expect(out.length).toBeLessThanOrEqual(Math.round(sr * 0.75));
  });
  it('returns silent input unchanged', () => {
    const s = silence(1);
    expect(trimSilence(s, sr)).toBe(s);
  });
  it('normalises peaks without clipping', () => {
    const quiet = tone(0.1, 0.1);
    const out = normalize(quiet);
    const max = Math.max(...Array.from(out).map(Math.abs));
    expect(max).toBeCloseTo(0.89, 2);
  });
  it('encodes a valid 16-bit PCM WAV with the right duration', async () => {
    const blob = encodeWav([tone(1)], sr);
    expect(blob.type).toBe('audio/wav');
    const header = readWavHeader(await blob.arrayBuffer());
    expect(header.sampleRate).toBe(sr);
    expect(header.channels).toBe(1);
    expect(header.durationSeconds).toBeCloseTo(1, 3);
    expect(blob.size).toBe(44 + sr * 2);
  });
  it('mixes stereo to mono', () => {
    const l = Float32Array.from([1, 0]);
    const r = Float32Array.from([0, 1]);
    expect(Array.from(mixToMono([l, r]))).toEqual([0.5, 0.5]);
  });
});
