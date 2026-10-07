import type { VideoProject } from '@guidedreel/schema';
import { useEffect, useMemo, useState } from 'react';
import { Music, RefreshCw, Check, Wand2, AlignHorizontalDistributeCenter } from 'lucide-react';
import {
  MUSIC_MOODS,
  alignScenesToBeat,
  clampBpm,
  detectBpm,
  planMusic,
  type MusicMood,
  type MusicPlan,
  MUSIC_ENERGIES,
  type MusicEnergy,
} from '@guidedreel/engine';
import { Button, Dialog, Field, Select, Slider, Switch, useToast } from '../primitives/index';
import { renderMusic } from '../audio/synth';
import { decodeToMono } from '../audio/wav';
import { useAssetImport } from '../hooks/useAssetImport';
import { useEditorStore } from '../store/editor-store';
import { useHost } from '../host/HostContext';
import { formatSeconds } from '../lib/format';

type MixPreset = 'background' | 'balanced' | 'foreground';
/** How loud the music sits against voiceovers; written to the project audio settings on Use. */
const MIX_PRESETS: Record<
  MixPreset,
  { label: string; musicVolume: number; duck: boolean; hint: string }
> = {
  background: {
    label: 'Background',
    musicVolume: 0.15,
    duck: true,
    hint: 'Quiet bed at 15%, dips to about 5% while a voiceover plays.',
  },
  balanced: {
    label: 'Balanced',
    musicVolume: 0.3,
    duck: true,
    hint: '30%, dips under voiceovers.',
  },
  foreground: {
    label: 'Foreground',
    musicVolume: 0.6,
    duck: false,
    hint: 'Music leads at 60% with no ducking, for videos without narration.',
  },
};

/**
 * Generate a background track from the scene structure (mood, tempo, intensity
 * per scene, exact length), preview it, use it as the project music, and
 * optionally snap scene cuts to the beat. Also detects the tempo of an uploaded
 * track so existing music can be beat-aligned too.
 */
export const MusicDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const project = useEditorStore((s) => s.project);
  const updateProject = useEditorStore((s) => s.updateProject);
  const { importFiles } = useAssetImport();
  const { assetResolver } = useHost();
  const toast = useToast();

  const suggested = useMemo(() => (project ? planMusic(project) : null), [project]);
  const [mood, setMood] = useState<MusicMood>('upbeat');
  const [energy, setEnergy] = useState<MusicEnergy>('medium');
  const [autoTempo, setAutoTempo] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [seed, setSeed] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string; plan: MusicPlan } | null>(null);
  const [alignAfter, setAlignAfter] = useState(true);
  const [mix, setMix] = useState<MixPreset>('background');
  const [detected, setDetected] = useState<{ bpm: number; confidence: number } | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (open && suggested) {
      setMood(suggested.mood);
      setBpm(suggested.bpm);
      setSeed(suggested.seed);
      setResult(null);
      setDetected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!project || !suggested) return null;
  const plan = planMusic(project, { mood, energy, bpm: autoTempo ? undefined : bpm, seed });
  const currentMusic = project.assets.find((a) => a.id === project.audio.musicAssetId);

  const generate = async () => {
    setRendering(true);
    setProgress(0);
    try {
      if (result) URL.revokeObjectURL(result.url);
      const { blob } = await renderMusic(plan, { onProgress: setProgress });
      setResult({ blob, url: URL.createObjectURL(blob), plan });
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Could not generate music',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRendering(false);
    }
  };

  const use = async () => {
    if (!result) return;
    const name = `Generated music · ${result.plan.mood} ${result.plan.energy} ${result.plan.bpm} BPM.wav`;
    const [asset] = await importFiles(
      [{ name, size: result.blob.size, mimeType: 'audio/wav', blob: result.blob }],
      'music',
    );
    if (!asset) return;
    updateProject((p) => {
      const m = MIX_PRESETS[mix];
      let next: VideoProject = {
        ...p,
        audio: {
          ...p.audio,
          musicAssetId: asset.id,
          musicVolume: m.musicVolume,
          duckMusic: m.duck,
        },
      };
      if (alignAfter) next = alignScenesToBeat(next, result.plan.bpm);
      return next;
    });
    toast.push({
      kind: 'success',
      title: 'Music added',
      description: `${MIX_PRESETS[mix].label} mix at ${Math.round(MIX_PRESETS[mix].musicVolume * 100)}%${MIX_PRESETS[mix].duck ? ', ducked under voiceovers' : ''}${alignAfter ? ` · cuts aligned to ${result.plan.bpm} BPM` : ''}.`,
    });
    onClose();
  };

  const detect = async () => {
    if (!currentMusic) return;
    setDetecting(true);
    try {
      const url = await assetResolver.resolve(currentMusic);
      const blob = await fetch(url).then((r) => r.blob());
      const { samples, sampleRate } = await decodeToMono(blob, 22_050);
      // Analyse up to 60 s to keep it quick.
      const r = detectBpm(
        samples.subarray(0, Math.min(samples.length, sampleRate * 60)),
        sampleRate,
      );
      setDetected(r);
      if (r.bpm) setBpm(clampBpm(r.bpm));
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Could not analyse track',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDetecting(false);
    }
  };

  const alignExisting = () => {
    const target = detected?.bpm ? clampBpm(detected.bpm) : bpm;
    updateProject((p) => alignScenesToBeat(p, target));
    toast.push({ kind: 'success', title: `Scenes aligned to ${target} BPM` });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Music"
      description="Generate a soundtrack that follows your scenes, or align your cuts to an uploaded track."
      size="lg"
      locked={rendering}
    >
      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="h-4 w-4 text-primary" /> Generate from scenes
          </h3>
          <Field label="Mood">
            <Select
              value={mood}
              onChange={(e) => setMood(e.target.value as MusicMood)}
              aria-label="Mood"
            >
              {MUSIC_MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Energy" description={MUSIC_ENERGIES.find((e) => e.value === energy)?.hint}>
            <div
              className="inline-flex rounded-md border border-border bg-surface-2 p-0.5"
              role="radiogroup"
              aria-label="Energy"
            >
              {MUSIC_ENERGIES.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  role="radio"
                  aria-checked={energy === e.value}
                  onClick={() => setEnergy(e.value)}
                  className={
                    energy === e.value
                      ? 'rounded-[6px] bg-surface-3 px-3 py-1 text-xs font-medium text-fg shadow-sm'
                      : 'rounded-[6px] px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg'
                  }
                >
                  {e.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-fg-muted">Tempo from scene pacing</span>
            <Switch
              checked={autoTempo}
              onCheckedChange={setAutoTempo}
              aria-label="Automatic tempo"
            />
          </div>
          <Field label="Tempo" hint={`${plan.bpm} BPM`}>
            <Slider
              value={autoTempo ? plan.bpm : bpm}
              min={60}
              max={180}
              step={1}
              onChange={(v) => {
                setAutoTempo(false);
                setBpm(v);
              }}
              aria-label="Tempo"
            />
          </Field>
          <div className="rounded-md border border-border bg-surface-2 p-2.5 text-[11px] text-fg-muted">
            {plan.sections.length} sections · {formatSeconds(plan.durationSeconds)} · intensity{' '}
            {Math.round(Math.min(...plan.sections.map((s) => s.intensity)) * 100)}–
            {Math.round(Math.max(...plan.sections.map((s) => s.intensity)) * 100)}%, peaking on{' '}
            {plan.sections.reduce((a, b) => (b.intensity > a.intensity ? b : a)).sceneType}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => void generate()} loading={rendering}>
              <Music className="h-3.5 w-3.5" /> {result ? 'Generate again' : 'Generate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSeed((s) => s + 1);
                setResult(null);
              }}
              disabled={rendering}
              title="New variation with the same settings"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Variation
            </Button>
          </div>
          {rendering ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          ) : null}
          {result ? (
            <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/5 p-3">
              <audio controls src={result.url} className="w-full" aria-label="Preview music" />
              <Field label="Mix" description={MIX_PRESETS[mix].hint}>
                <div
                  className="inline-flex rounded-md border border-border bg-surface-2 p-0.5"
                  role="radiogroup"
                  aria-label="Mix"
                >
                  {(Object.keys(MIX_PRESETS) as MixPreset[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={mix === k}
                      onClick={() => setMix(k)}
                      className={
                        mix === k
                          ? 'rounded-[6px] bg-surface-3 px-3 py-1 text-xs font-medium text-fg shadow-sm'
                          : 'rounded-[6px] px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg'
                      }
                    >
                      {MIX_PRESETS[k].label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Align scene cuts to the beat</span>
                <Switch
                  checked={alignAfter}
                  onCheckedChange={setAlignAfter}
                  aria-label="Align cuts to the beat"
                />
              </div>
              <Button variant="primary" size="sm" onClick={() => void use()}>
                <Check className="h-3.5 w-3.5" /> Use as project music
              </Button>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-3 md:border-l md:border-border md:pl-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlignHorizontalDistributeCenter className="h-4 w-4 text-primary" /> Beat-align existing
            music
          </h3>
          {currentMusic ? (
            <>
              <p className="text-[11px] text-fg-muted">
                Current track: <span className="text-fg">{currentMusic.name}</span>
                {currentMusic.duration ? ` · ${formatSeconds(currentMusic.duration)}` : ''}
              </p>
              <Button variant="outline" size="sm" onClick={() => void detect()} loading={detecting}>
                Detect tempo
              </Button>
              {detected ? (
                <p className="text-xs">
                  {detected.bpm ? (
                    <>
                      Detected <span className="font-mono font-semibold">{detected.bpm} BPM</span> ·
                      confidence {Math.round(detected.confidence * 100)}%
                    </>
                  ) : (
                    'Could not find a steady tempo.'
                  )}
                </p>
              ) : null}
              <Field label="Align to" hint={`${detected?.bpm ? clampBpm(detected.bpm) : bpm} BPM`}>
                <Slider
                  value={detected?.bpm ? clampBpm(detected.bpm) : bpm}
                  min={60}
                  max={180}
                  step={1}
                  onChange={(v) => {
                    setDetected(null);
                    setAutoTempo(false);
                    setBpm(v);
                  }}
                  aria-label="Alignment tempo"
                />
              </Field>
              <Button size="sm" onClick={alignExisting}>
                Align scene cuts
              </Button>
              <p className="text-[10px] text-fg-subtle">
                Scene lengths snap to whole beats (never below each scene's minimum). Scenes that
                follow a voiceover are left alone. Undo reverts it.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-fg-muted">
              No music on this project yet. Pick a track in the Music field or generate one on the
              left; then you can align cuts to its tempo here.
            </p>
          )}
        </section>
      </div>
    </Dialog>
  );
};
