import type { MusicPlan } from '@guidedreel/engine';
import { encodeWav } from './wav';

/**
 * Procedural background-music renderer. Turns a MusicPlan (mood, tempo, key,
 * progression, per-scene intensity) into a WAV using OfflineAudioContext.
 * Deterministic for a given plan (seeded PRNG), so "regenerate" with a new seed
 * yields a different take and the same seed reproduces the track.
 */
export type SynthOptions = { sampleRate?: number; onProgress?: (p: number) => void };

export async function renderMusic(
  plan: MusicPlan,
  options: SynthOptions = {},
): Promise<{ blob: Blob; durationSeconds: number }> {
  const sampleRate = options.sampleRate ?? 44_100;
  const tail = 1.5; // let the last notes ring
  const duration = plan.durationSeconds + tail;
  const Offline = (globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
    .OfflineAudioContext;
  if (!Offline) throw new Error('OfflineAudioContext is not available in this environment');
  const ctx = new Offline(2, Math.ceil(duration * sampleRate), sampleRate);
  const rand = mulberry32(plan.seed);

  // Master chain: gentle compression, overall fade in/out.
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  master.connect(comp).connect(ctx.destination);
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.8, Math.min(1.5, plan.durationSeconds / 4));
  master.gain.setValueAtTime(0.8, Math.max(0, plan.durationSeconds - 2));
  master.gain.linearRampToValueAtTime(0, plan.durationSeconds + 0.6);

  const beat = 60 / plan.bpm;
  const bar = beat * 4;
  const tonic = 48 + plan.key; // C3 + key
  const degreeToMidi = (degree: number, octave = 0) => {
    const scaleLen = plan.scale.length;
    const idx = ((degree % scaleLen) + scaleLen) % scaleLen;
    const oct = Math.floor(degree / scaleLen) + octave;
    return tonic + plan.scale[idx]! + 12 * oct;
  };
  const chordTones = (degree: number) => [degree, degree + 2, degree + 4];
  const moodBright = plan.mood === 'upbeat' || plan.mood === 'warm';

  // Per-section intensity lookup (seconds → 0..1)
  const intensityAt = (t: number): number => {
    const s =
      plan.sections.find((sec) => t >= sec.startSeconds && t < sec.endSeconds) ??
      plan.sections[plan.sections.length - 1];
    return s ? s.intensity : 0.5;
  };

  const totalBars = Math.ceil(plan.durationSeconds / bar);
  for (let b = 0; b < totalBars; b++) {
    const t0 = b * bar;
    const degree = plan.progression[b % plan.progression.length]!;
    const inten = intensityAt(t0 + bar / 2);
    options.onProgress?.(b / totalBars);

    // Pad: two detuned saws per chord tone through a lowpass, always present.
    pad(
      ctx,
      master,
      chordTones(degree).map((d) => degreeToMidi(d, 0)),
      t0,
      bar,
      0.08 + 0.06 * inten,
      moodBright ? 1800 + 1200 * inten : 1200 + 800 * inten,
    );

    // Bass: root on beats 1 and 3 (and 2+ when intense).
    const bassMidi = degreeToMidi(degree, -1);
    pluck(ctx, master, bassMidi, t0, beat * 0.9, 0.22 + 0.1 * inten, 'triangle');
    pluck(ctx, master, bassMidi, t0 + 2 * beat, beat * 0.9, 0.2 + 0.1 * inten, 'triangle');
    if (inten > 0.6)
      pluck(
        ctx,
        master,
        bassMidi + (moodBright ? 12 : 7),
        t0 + 3.5 * beat,
        beat * 0.4,
        0.14,
        'triangle',
      );

    // Drums: kick on 1 & 3 (+ 2,4 when intense), snare/clap on 2 & 4 when inten>0.45, hats when inten>0.3.
    const drumGain = 0.5 + 0.5 * inten;
    kick(ctx, master, t0, 0.9 * drumGain);
    kick(ctx, master, t0 + 2 * beat, 0.9 * drumGain);
    if (inten > 0.75) kick(ctx, master, t0 + 3.5 * beat, 0.6 * drumGain);
    if (inten > 0.45) {
      snare(ctx, master, t0 + beat, 0.5 * drumGain);
      snare(ctx, master, t0 + 3 * beat, 0.5 * drumGain);
    }
    if (inten > 0.3) {
      const steps = inten > 0.65 ? 8 : 4;
      for (let i = 0; i < steps; i++)
        hat(
          ctx,
          master,
          t0 + (i * bar) / steps,
          (i % 2 === 0 ? 0.18 : 0.12) * drumGain,
          i % 2 === 1,
        );
    }

    // Arpeggio / melody: 8ths when intense, sparse otherwise; pentatonic-ish picks from the chord.
    const notes = inten > 0.55 ? 8 : inten > 0.35 ? 4 : 2;
    const tones = chordTones(degree).concat([degree + 7]);
    for (let i = 0; i < notes; i++) {
      if (rand() < 0.15) continue; // breathing room
      const pick = tones[Math.floor(rand() * tones.length)]!;
      const midi = degreeToMidi(pick, 1 + (rand() < 0.2 ? 1 : 0));
      pluck(
        ctx,
        master,
        midi,
        t0 + (i * bar) / notes,
        (bar / notes) * 0.8,
        0.07 + 0.08 * inten,
        moodBright ? 'triangle' : 'sine',
      );
    }
  }
  options.onProgress?.(1);

  const buffer = await ctx.startRendering();
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  return { blob: encodeWav(channels, sampleRate), durationSeconds: buffer.duration };
}

/* ----------------------------- instruments ------------------------------ */

function midiToHz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function pluck(
  ctx: BaseAudioContext,
  out: AudioNode,
  midi: number,
  t: number,
  len: number,
  gain: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = midiToHz(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + len);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

function pad(
  ctx: BaseAudioContext,
  out: AudioNode,
  midis: number[],
  t: number,
  len: number,
  gain: number,
  cutoff: number,
) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.6, len / 3));
  g.gain.setValueAtTime(gain, t + len - 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
  filter.connect(g).connect(out);
  for (const m of midis) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToHz(m);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + len + 0.5);
    }
  }
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.4);
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buf;
}

function snare(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.25);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  src.connect(filter).connect(g).connect(out);
  src.start(t);
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.setValueAtTime(220, t);
  body.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(gain * 0.5, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  body.connect(bg).connect(out);
  body.start(t);
  body.stop(t + 0.15);
}

function hat(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number, open: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, open ? 0.15 : 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.14 : 0.05));
  src.connect(filter).connect(g).connect(out);
  src.start(t);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
