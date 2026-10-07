import type { SceneType, VideoProject } from '@guidedreel/schema';
import { calculateTimeline } from '../timeline';

export type MusicMood = 'upbeat' | 'warm' | 'calm' | 'dramatic';
export const MUSIC_MOODS: { value: MusicMood; label: string; hint: string }[] = [
  { value: 'upbeat', label: 'Upbeat', hint: 'Bright, driving · reels, promos' },
  { value: 'warm', label: 'Warm', hint: 'Friendly, mid-tempo · products, brands' },
  { value: 'calm', label: 'Calm', hint: 'Soft pads, sparse · education, testimonials' },
  { value: 'dramatic', label: 'Dramatic', hint: 'Minor key, building · news, launches' },
];

export type MusicEnergy = 'soft' | 'medium' | 'hard';
export const MUSIC_ENERGIES: { value: MusicEnergy; label: string; hint: string }[] = [
  { value: 'soft', label: 'Soft', hint: 'Background bed: pads and light bass, almost no drums' },
  { value: 'medium', label: 'Medium', hint: 'Balanced: drums enter on busier scenes' },
  { value: 'hard', label: 'Hard', hint: 'Driving: full drums throughout, faster tempo' },
];

export type MusicSection = {
  sceneId: string;
  sceneType: SceneType;
  startSeconds: number;
  endSeconds: number;
  /** 0..1 energy; drives which instrument layers play. */
  intensity: number;
};

export type MusicPlan = {
  mood: MusicMood;
  bpm: number;
  /** Semitone offset of the tonic from C (0 = C). */
  key: number;
  /** Scale intervals in semitones. */
  scale: number[];
  /** Chord progression as scale degrees (0-based), one chord per bar, repeating. */
  progression: number[];
  durationSeconds: number;
  sections: MusicSection[];
  seed: number;
  energy: MusicEnergy;
};

export type PlanMusicOptions = {
  mood?: MusicMood;
  bpm?: number;
  seed?: number;
  energy?: MusicEnergy;
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const MOOD_DEFAULTS: Record<
  MusicMood,
  { bpm: number; scale: number[]; progression: number[]; keys: number[] }
> = {
  upbeat: { bpm: 122, scale: MAJOR, progression: [0, 4, 5, 3], keys: [0, 2, 7, 9] },
  warm: { bpm: 100, scale: MAJOR, progression: [0, 5, 3, 4], keys: [5, 7, 10, 0] },
  calm: { bpm: 78, scale: MAJOR, progression: [0, 3, 5, 4], keys: [2, 4, 9, 7] },
  dramatic: { bpm: 92, scale: MINOR, progression: [0, 5, 3, 4], keys: [9, 4, 2, 7] },
};

const SCENE_INTENSITY: Record<SceneType, number> = {
  hook: 0.65,
  intro: 0.5,
  text: 0.5,
  image: 0.5,
  video: 0.5,
  feature: 0.7,
  product: 0.7,
  quote: 0.35,
  cta: 1,
  outro: 0.3,
};

/** Mood suggested by the template, when the user has not chosen one. */
export function suggestMood(project: VideoProject): MusicMood {
  switch (project.templateId) {
    case 'social-reel':
      return 'upbeat';
    case 'product-ad':
      return 'warm';
    case 'modern-promo':
      return 'upbeat';
    default: {
      const types = new Set(project.scenes.map((s) => s.type));
      if (types.has('quote') && !types.has('cta')) return 'calm';
      return 'warm';
    }
  }
}

/**
 * Builds a deterministic music plan from the scene structure: mood from the
 * template, tempo from pacing, one section per scene with an intensity curve
 * that ramps through features and peaks on the call to action.
 */
export function planMusic(project: VideoProject, options: PlanMusicOptions = {}): MusicPlan {
  const timeline = calculateTimeline(project);
  const fps = project.format.fps;
  const mood = options.mood ?? suggestMood(project);
  const defaults = MOOD_DEFAULTS[mood];
  const seed = options.seed ?? hashString(project.id);

  // Faster cuts → slightly faster tempo (±10 BPM), unless the user set one.
  const visible = timeline.sceneOrder;
  const avgSceneSeconds = visible.length ? timeline.totalFrames / fps / visible.length : 4;
  const pacing = avgSceneSeconds < 3 ? 10 : avgSceneSeconds > 6 ? -8 : 0;
  const energy = options.energy ?? 'medium';
  const energyTempo = energy === 'soft' ? -10 : energy === 'hard' ? 10 : 0;
  const bpm = clampBpm(options.bpm ?? defaults.bpm + pacing + energyTempo);

  const featureItems = visible.filter(
    (i) => project.scenes.find((s) => s.id === i.refId)?.type === 'feature',
  );
  let featureIndex = 0;
  const sections: MusicSection[] = visible.map((item) => {
    const scene = project.scenes.find((s) => s.id === item.refId)!;
    let intensity = SCENE_INTENSITY[scene.type];
    if (scene.type === 'feature' && featureItems.length > 1) {
      intensity = 0.6 + (0.25 * featureIndex) / (featureItems.length - 1);
      featureIndex += 1;
    }
    return {
      sceneId: scene.id,
      sceneType: scene.type,
      startSeconds: item.startFrame / fps,
      endSeconds: item.endFrame / fps,
      intensity: Math.round(applyEnergy(intensity, energy) * 100) / 100,
    };
  });

  return {
    mood,
    bpm,
    key: defaults.keys[seed % defaults.keys.length]!,
    scale: defaults.scale,
    progression: defaults.progression,
    durationSeconds: Math.max(1, timeline.totalFrames / fps),
    sections,
    seed,
    energy,
  };
}

/** Maps the scene-derived intensity (0..1) into the band for the chosen energy. */
export function applyEnergy(intensity: number, energy: MusicEnergy): number {
  const [lo, hi] = energy === 'soft' ? [0.1, 0.4] : energy === 'hard' ? [0.65, 1] : [0.3, 1];
  return lo + (hi - lo) * Math.min(1, Math.max(0, intensity));
}

export function clampBpm(bpm: number): number {
  return Math.round(Math.min(180, Math.max(60, bpm)));
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1_000_000;
}
