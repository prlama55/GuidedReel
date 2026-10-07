/**
 * Tempo detection for uploaded music: onset-energy envelope + autocorrelation.
 * Pure math on PCM samples so it runs in the browser, in Node tests and on the
 * desktop alike. Good for steady pop/electronic tracks (±2 BPM), not for rubato.
 */
export type BpmResult = { bpm: number; confidence: number };

export function detectBpm(
  samples: Float32Array,
  sampleRate: number,
  options: { minBpm?: number; maxBpm?: number } = {},
): BpmResult {
  const minBpm = options.minBpm ?? 60;
  const maxBpm = options.maxBpm ?? 180;
  const hop = Math.max(1, Math.round(sampleRate / 100)); // 100 envelope frames per second
  const frames = Math.floor(samples.length / hop);
  if (frames < 200) return { bpm: 0, confidence: 0 };

  // Energy envelope → onset strength (half-wave rectified difference).
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * hop;
    for (let i = start; i < start + hop; i++) sum += samples[i]! * samples[i]!;
    energy[f] = Math.sqrt(sum / hop);
  }
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, energy[f]! - energy[f - 1]!);
  const mean = onset.reduce((a, b) => a + b, 0) / frames;
  for (let f = 0; f < frames; f++) onset[f] = onset[f]! - mean;

  // Autocorrelation over the BPM range (lag in envelope frames).
  const envRate = sampleRate / hop;
  const minLag = Math.floor((60 / maxBpm) * envRate);
  const maxLag = Math.ceil((60 / minBpm) * envRate);
  const scores = new Float32Array(maxLag + 1);
  let bestLag = 0;
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let f = lag; f < frames; f++) sum += onset[f]! * onset[f - lag]!;
    const score = sum / (frames - lag);
    scores[lag] = score;
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  // Confidence: how much the winner stands out from the best *distinct* candidate
  // (outside ±12% of the winning lag, so neighbouring lags do not count).
  // Harmonics of the winner (double/half/triple time) are the same tempo, not rivals.
  const related = (lag: number) =>
    [0.25, 1 / 3, 0.5, 1, 2, 3, 4].some((k) => Math.abs(lag - bestLag * k) <= bestLag * k * 0.12);
  let second = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (related(lag)) continue;
    second = Math.max(second, scores[lag]!);
  }
  if (bestLag === 0 || best <= 0) return { bpm: 0, confidence: 0 };
  let bpm = (60 * envRate) / bestLag;
  // Fold into a comfortable range (half/double-time ambiguity).
  while (bpm < 70) bpm *= 2;
  while (bpm > 170) bpm /= 2;
  const confidence = Math.max(0, Math.min(1, 1 - second / best));
  return { bpm: Math.round(bpm * 10) / 10, confidence };
}
