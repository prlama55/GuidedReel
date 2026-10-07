import { useState } from 'react';
import { AppShell } from './AppShell';
import { NewProjectDialog } from './NewProjectDialog';
import { Badge, Button } from '../primitives/index';
import { useHost } from '../host/HostContext';

export const TemplatesPage: React.FC = () => {
  const { templates } = useHost();
  const [preset, setPreset] = useState<string | null>(null);
  const list = templates.list();
  return (
    <AppShell title="Templates">
      <p className="mb-6 max-w-2xl text-sm text-fg-muted">
        Templates define the scene structure and pacing of a video. Every template supports several
        aspect ratios, so the same template serves Reels, Shorts, Stories and landscape videos.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => (
          <div key={t.id} className="flex flex-col rounded-lg border border-border bg-surface p-4">
            <div
              className="flex h-28 items-end rounded-md p-3"
              style={{
                background: `linear-gradient(135deg, ${t.accentColor ?? '#6366f1'}, color-mix(in srgb, ${t.accentColor ?? '#6366f1'} 40%, var(--vc-stage)))`,
              }}
            >
              <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {t.category}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{t.name}</h3>
            <p className="mt-1 flex-1 text-xs text-fg-muted">{t.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {t.supportedFormats.map((f) => (
                <Badge key={f}>{f}</Badge>
              ))}
              {t.typicalDurationSeconds ? (
                <Badge tone="primary">~{t.typicalDurationSeconds}s</Badge>
              ) : null}
            </div>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => setPreset(t.id)}>
              Use template
            </Button>
          </div>
        ))}
      </div>
      <NewProjectDialog
        open={preset !== null}
        onClose={() => setPreset(null)}
        presetTemplateId={preset ?? undefined}
      />
    </AppShell>
  );
};
