import { useEffect, useState } from 'react';
import { Check, Download, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { CLOUD_TTS_PROVIDERS, type CloudTtsProviderId } from '@guidedreel/providers';
import { Button, Field, Input, useToast } from '../primitives/index';
import { useHost } from '../host/HostContext';
import type { InstallProgress, LocalVoiceStatus } from '../tts/client';
import { friendlyTtsError } from '../editor/VoiceoverDialog';

/** Settings section: cloud API keys (stored only on this device) and local Piper voices (desktop). */
export const ProvidersSettings: React.FC = () => {
  const { tts, platform } = useHost();
  const toast = useToast();
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [voices, setVoices] = useState<LocalVoiceStatus[]>([]);
  const [installing, setInstalling] = useState<Record<string, InstallProgress>>({});
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const hasLocal = Boolean(tts?.installVoice);

  const refresh = async () => {
    if (!tts) return;
    try {
      const entries = await Promise.all(
        CLOUD_TTS_PROVIDERS.map(async (p) => [p.id, await tts.hasApiKey(p.id)] as const),
      );
      setStatus(Object.fromEntries(entries));
      if (hasLocal) setVoices((await tts.listVoices('local')) as LocalVoiceStatus[]);
      setUnavailable(null);
    } catch (err) {
      setUnavailable(friendlyTtsError(err));
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts]);

  if (!tts) return null;
  if (unavailable) {
    return (
      <section className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs">
        <h2 className="mb-1 text-sm font-semibold text-fg">Voice providers</h2>
        {unavailable}
      </section>
    );
  }

  const save = async (id: CloudTtsProviderId) => {
    await tts.setApiKey(id, drafts[id] ?? '');
    setDrafts((d) => ({ ...d, [id]: '' }));
    await refresh();
    toast.push({
      kind: 'success',
      title: `${CLOUD_TTS_PROVIDERS.find((p) => p.id === id)?.label} key saved`,
    });
  };
  const clear = async (id: CloudTtsProviderId) => {
    await tts.setApiKey(id, '');
    await refresh();
  };
  const install = async (voiceId: string) => {
    if (!tts.installVoice) return;
    try {
      await tts.installVoice(voiceId, (p) => setInstalling((m) => ({ ...m, [voiceId]: p })));
      toast.push({ kind: 'success', title: 'Voice installed' });
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Install failed',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInstalling((m) => {
        const { [voiceId]: _omit, ...rest } = m;
        return rest;
      });
      await refresh();
    }
  };

  return (
    <>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        <div>
          <h2 className="text-sm font-semibold">Voice providers (your own API keys)</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Keys are stored only on this device
            {platform.name === 'desktop'
              ? ' (encrypted by the operating system)'
              : ' (in this browser)'}{' '}
            and are sent directly to the provider when you generate speech. Usage is billed to your
            account with that provider.
          </p>
        </div>
        {CLOUD_TTS_PROVIDERS.map((p) => (
          <Field
            key={p.id}
            label={
              <span className="flex items-center gap-2">
                {p.label}
                {status[p.id] ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                    <Check className="h-3 w-3" /> key saved
                  </span>
                ) : null}
              </span>
            }
            description={
              (
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Where to get a key
                </a>
              ) as unknown as string
            }
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={show[p.id] ? 'text' : 'password'}
                  value={drafts[p.id] ?? ''}
                  placeholder={
                    status[p.id] ? '•••••••• (saved) — paste a new key to replace' : p.keyHint
                  }
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  aria-label={`${p.label} API key`}
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-fg-subtle hover:text-fg"
                  onClick={() => setShow((s) => ({ ...s, [p.id]: !s[p.id] }))}
                  aria-label={show[p.id] ? 'Hide key' : 'Show key'}
                >
                  {show[p.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => void save(p.id)}
                disabled={!(drafts[p.id] ?? '').trim()}
              >
                Save
              </Button>
              {status[p.id] ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void clear(p.id)}
                  aria-label={`Remove ${p.label} key`}
                  className="hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </Field>
        ))}
      </section>

      {hasLocal ? (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div>
            <h2 className="text-sm font-semibold">Local voices (free, offline)</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Piper runs on this computer; no account or internet is needed after a voice is
              installed. The engine is downloaded with the first voice.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {voices.map((v) => {
              const prog = installing[v.id];
              return (
                <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {v.name}{' '}
                      <span className="text-xs text-fg-subtle">· {v.languages.join(', ')}</span>
                    </div>
                    <div className="text-[11px] text-fg-muted">
                      {v.description}
                      {prog
                        ? ` · ${prog.message ?? prog.phase} ${Math.round(prog.progress * 100)}%`
                        : ''}
                    </div>
                    {prog ? (
                      <div className="mt-1 h-1 w-48 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.round(prog.progress * 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                  {v.installed ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <Check className="h-3.5 w-3.5" /> Installed
                      </span>
                      {tts.removeVoice ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            await tts.removeVoice!(v.id);
                            await refresh();
                          }}
                          aria-label={`Remove ${v.name}`}
                          className="hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </>
                  ) : prog ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void install(v.id)}>
                      <Download className="h-3.5 w-3.5" /> Install
                      {v.sizeMb ? ` (${v.sizeMb} MB)` : ''}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
};
