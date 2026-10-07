import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Sparkles, Wand2 } from 'lucide-react';
import type { TtsVoice } from '@guidedreel/engine';
import { getSceneDefinition, type VideoScene } from '@guidedreel/schema';
import {
  Button,
  Dialog,
  Field,
  Select,
  Slider,
  Switch,
  Textarea,
  useToast,
} from '../primitives/index';
import { useHost } from '../host/HostContext';
import { useAssetImport } from '../hooks/useAssetImport';
import { useEditorStore } from '../store/editor-store';
import { useLocalSetting } from '../hooks/useLocalSetting';
import { RouteLink } from '../pages/AppShell';
import type { TtsProviderId, TtsProviderInfo } from '../tts/client';
import { cn } from '../lib/cn';

/**
 * Generate voiceover from the scene script with a text-to-speech provider:
 * local Piper on desktop, or a cloud provider with the user's own key. Works
 * for one scene or every scene that has script text.
 */
/** Maps transport failures to actionable messages (e.g. an app that still runs an older main process). */
export function friendlyTtsError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/No handler registered|is not a function|Cannot read properties of undefined/.test(msg)) {
    return 'Voice features are not available in this running app version. Quit and reopen the app (or restart `pnpm dev:desktop`) so the updated main process loads, then try again.';
  }
  return msg;
}

/** The scene's script text (its type's scriptKey), trimmed. */
function scriptOf(s: VideoScene): string {
  const def = getSceneDefinition(s.type);
  const v = def.scriptKey ? s.props[def.scriptKey] : undefined;
  return typeof v === 'string' ? v.trim() : '';
}

export const VoiceoverDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  sceneId?: string;
}> = ({ open, onClose, sceneId }) => {
  const { tts } = useHost();
  const project = useEditorStore((s) => s.project);
  const setSceneVoiceover = useEditorStore((s) => s.setSceneVoiceover);
  const { importFiles } = useAssetImport();
  const toast = useToast();

  const [providers, setProviders] = useState<TtsProviderInfo[]>([]);
  const [provider, setProvider] = useLocalSetting<TtsProviderId | ''>('tts.provider', '');
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceId, setVoiceId] = useLocalSetting<string>('tts.voice', '');
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState('');
  const [speed, setSpeed] = useState(1);
  const [text, setText] = useState('');
  const [fitScene, setFitScene] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    current?: string;
  } | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const scene = project?.scenes.find((s) => s.id === sceneId);
  const batchScenes = useMemo(
    () => (project ? project.scenes.filter((s) => !s.hidden && scriptOf(s)) : []),
    [project],
  );

  useEffect(() => {
    if (!open || !tts) return;
    setError(null);
    setPreview(null);
    setText(scene ? scriptOf(scene) : '');
    tts
      .providers()
      .then((list) => {
        setProviders(list);
        const first = list.find((p) => p.available) ?? list[0];
        if (!provider || !list.some((p) => p.id === provider)) setProvider(first?.id ?? '');
      })
      .catch((err) => setError(friendlyTtsError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sceneId]);

  useEffect(() => {
    if (!open || !tts || !provider) return;
    const info = providers.find((p) => p.id === provider);
    if (info && !info.available) {
      setVoices([]);
      return;
    }
    setVoicesLoading(true);
    setError(null);
    tts
      .listVoices(provider)
      .then((list) => {
        setVoices(list);
        if (!list.some((v) => v.id === voiceId))
          setVoiceId(list.find((v) => v.installed !== false)?.id ?? list[0]?.id ?? '');
      })
      .catch((err) => setError(friendlyTtsError(err)))
      .finally(() => setVoicesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider, providers]);

  if (!project || !tts) return null;
  const info = providers.find((p) => p.id === provider);
  const selectedVoice = voices.find((v) => v.id === voiceId);
  const visibleVoices = voices.filter(
    (v) =>
      !voiceFilter ||
      `${v.name} ${v.languages.join(' ')} ${v.description ?? ''}`
        .toLowerCase()
        .includes(voiceFilter.toLowerCase()),
  );
  const canGenerate = Boolean(
    provider && info?.available && voiceId && (selectedVoice?.installed ?? true),
  );

  const synthesize = async (content: string) => {
    abort.current = new AbortController();
    return tts.synthesize(
      {
        provider: provider as TtsProviderId,
        voiceId,
        text: content,
        speed,
        language: selectedVoice?.languages[0],
      },
      abort.current.signal,
    );
  };

  const attach = async (targetSceneId: string, blob: Blob, label: string) => {
    const ext = blob.type.includes('mpeg') ? 'mp3' : blob.type.includes('ogg') ? 'ogg' : 'wav';
    const [asset] = await importFiles(
      [
        {
          name: `Voiceover ${label} (${selectedVoice?.name ?? provider}).${ext}`,
          size: blob.size,
          mimeType: blob.type || 'audio/wav',
          blob,
        },
      ],
      'voiceover',
    );
    if (!asset) return false;
    setSceneVoiceover(targetSceneId, asset.id);
    if (!fitScene) useEditorStore.getState().updateScene(targetSceneId, { durationMode: 'fixed' });
    return true;
  };

  const generateOne = async () => {
    if (!scene) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await synthesize(text);
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const applyOne = async () => {
    if (!scene || !preview) return;
    setBusy(true);
    try {
      if (await attach(scene.id, preview.blob, scene.title ?? scene.type)) {
        toast.push({ kind: 'success', title: 'Voiceover attached' });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  const generateAll = async () => {
    setBusy(true);
    setError(null);
    let done = 0;
    let failed = 0;
    setProgress({ done, total: batchScenes.length });
    for (const s of batchScenes) {
      setProgress({ done, total: batchScenes.length, current: s.title ?? s.type });
      try {
        const blob = await synthesize(scriptOf(s));
        if (!(await attach(s.id, blob, s.title ?? s.type))) failed += 1;
      } catch (err) {
        failed += 1;
        if (err instanceof Error && err.name === 'AbortError') break;
        setError(err instanceof Error ? err.message : String(err));
      }
      done += 1;
    }
    setProgress(null);
    setBusy(false);
    toast.push({
      kind: failed ? 'error' : 'success',
      title: failed
        ? `${batchScenes.length - failed} of ${batchScenes.length} voiceovers generated`
        : `Voiceovers generated for ${batchScenes.length} scenes`,
    });
    if (!failed) onClose();
  };

  const cancel = () => {
    abort.current?.abort();
    setBusy(false);
    setProgress(null);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        cancel();
        onClose();
      }}
      title={scene ? 'Generate voiceover' : 'Generate voiceovers for all scenes'}
      description={
        scene
          ? `For "${scene.title ?? scene.type}"`
          : `${batchScenes.length} scene${batchScenes.length === 1 ? '' : 's'} with script text`
      }
      size="lg"
      locked={busy}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Provider" description={info?.reason}>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value as TtsProviderId)}
              aria-label="Provider"
              disabled={busy}
            >
              {providers.length === 0 ? <option value="">Loading…</option> : null}
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.kind === 'local' ? ' (on this computer, free)' : ''}
                  {!p.available ? ' — needs setup' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Voice"
            hint={
              voicesLoading ? 'Loading…' : voices.length ? `${voices.length} voices` : undefined
            }
          >
            <div className="flex flex-col gap-1.5">
              {voices.length > 12 ? (
                <input
                  value={voiceFilter}
                  onChange={(e) => setVoiceFilter(e.target.value)}
                  placeholder="Filter by name or language (ne-NP, en…)"
                  className="h-8 w-full rounded-md border border-border bg-surface-2 px-2.5 text-sm"
                  aria-label="Filter voices"
                />
              ) : null}
              <Select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                aria-label="Voice"
                disabled={busy || voicesLoading || !info?.available}
              >
                {visibleVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.languages.join(', ')}
                    {v.description ? ` · ${v.description}` : ''}
                    {v.installed === false ? ' · not installed' : ''}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
        </div>
        {info && !info.available ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            {info.kind === 'cloud' ? (
              <>
                This provider needs your own API key.{' '}
                <RouteLink
                  route={{ name: 'settings' }}
                  className="font-medium text-primary underline"
                >
                  Add it in Settings
                </RouteLink>{' '}
                — it is stored only on this device and sent straight to {info.label}.
              </>
            ) : (
              (info.reason ?? 'Not available on this device.')
            )}
          </div>
        ) : null}
        {selectedVoice && selectedVoice.installed === false ? (
          <div className="rounded-md border border-border bg-surface-2 p-3 text-xs">
            This voice is not installed yet.{' '}
            <RouteLink route={{ name: 'settings' }} className="font-medium text-primary underline">
              Install it in Settings → Voices
            </RouteLink>
            .
          </div>
        ) : null}
        <Field label="Speed" hint={`${speed.toFixed(2)}×`}>
          <Slider
            value={speed}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={setSpeed}
            disabled={busy}
            aria-label="Speed"
          />
        </Field>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-fg-muted">Fit scene length to the voiceover</span>
          <Switch
            checked={fitScene}
            onCheckedChange={setFitScene}
            aria-label="Fit scene to voiceover"
          />
        </div>

        {scene ? (
          <>
            <Field label="Text to speak" hint={`${text.length} chars`}>
              <Textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                aria-label="Text to speak"
              />
            </Field>
            {error ? (
              <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
                {error}
              </div>
            ) : null}
            {preview ? (
              <div className="flex flex-col gap-2 rounded-lg border border-success/40 bg-success/5 p-3">
                <audio
                  controls
                  src={preview.url}
                  className="w-full"
                  aria-label="Preview voiceover"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void generateOne()}
                    loading={busy}
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Generate again
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void applyOne()}
                    loading={busy}
                  >
                    <Check className="h-3.5 w-3.5" /> Use for this scene
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void generateOne()}
                  disabled={!canGenerate || !text.trim()}
                  loading={busy}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generate
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface-2 p-2 text-xs">
              {batchScenes.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    'flex items-center gap-2 py-0.5',
                    progress?.current === (s.title ?? s.type) && 'text-primary',
                  )}
                >
                  {progress?.current === (s.title ?? s.type) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  <span className="w-28 shrink-0 truncate font-medium">{s.title ?? s.type}</span>
                  <span className="truncate text-fg-muted">{scriptOf(s)}</span>
                  {s.voiceoverAssetId ? (
                    <span className="ml-auto shrink-0 text-[10px] text-fg-subtle">
                      has voiceover · will be replaced
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {error ? (
              <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
                {error}
              </div>
            ) : null}
            {progress ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  }}
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              {busy ? (
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={() => void generateAll()}
                disabled={!canGenerate || batchScenes.length === 0}
                loading={busy}
              >
                <Sparkles className="h-3.5 w-3.5" /> Generate {batchScenes.length} voiceover
                {batchScenes.length === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
