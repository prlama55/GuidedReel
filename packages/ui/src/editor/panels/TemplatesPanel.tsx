import { useState } from 'react';
import { aspectRatioOf } from '@guidedreel/schema';
import { Button, SectionTitle, Badge, ConfirmDialog } from '../../primitives/index';
import { useHost } from '../../host/HostContext';
import { useEditorStore } from '../../store/editor-store';
import { cn } from '../../lib/cn';

/** Switch the project to another template's structure (keeps name, format, brand and assets). */
export const TemplatesPanel: React.FC = () => {
  const { templates } = useHost();
  const project = useEditorStore((s) => s.project);
  const updateProject = useEditorStore((s) => s.updateProject);
  const select = useEditorStore((s) => s.select);
  const [pending, setPending] = useState<string | null>(null);
  if (!project) return null;
  const ratio = aspectRatioOf(project.format);
  const list = templates.list().filter((t) => t.id !== 'blank');

  const apply = (id: string) => {
    const t = templates.require(id);
    const generated = templates.instantiate(id, t.sampleInput(), {
      name: project.name,
      format: project.format,
      aspectRatio: ratio,
      projectId: project.id,
    });
    updateProject((p) => ({
      ...p,
      templateId: id,
      scenes: generated.scenes,
      settings: { ...p.settings, defaultTransition: generated.settings.defaultTransition },
    }));
    const first = generated.scenes[0];
    select(first ? { kind: 'scene', sceneId: first.id } : { kind: 'project' });
  };

  return (
    <div className="flex h-full flex-col">
      <SectionTitle>Templates</SectionTitle>
      <p className="px-3 pb-2 text-[11px] text-fg-muted">
        Applying a template replaces your scenes with the template's structure and sample content.
        Assets, brand and format are kept.
      </p>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <ul className="flex flex-col gap-2">
          {list.map((t) => {
            const supported = t.supportedFormats.includes(ratio);
            const current = t.id === project.templateId;
            return (
              <li
                key={t.id}
                className={cn(
                  'rounded-md border p-3',
                  current ? 'border-primary/60 bg-primary/5' : 'border-border bg-surface-2',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-md"
                    style={{ background: t.accentColor ?? 'var(--vc-primary)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {t.name}
                      {current ? <Badge tone="primary">Current</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-fg-muted">{t.description}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.supportedFormats.map((f) => (
                        <Badge key={f} tone={f === ratio ? 'success' : 'neutral'}>
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={current ? 'outline' : 'secondary'}
                  className="mt-2 w-full"
                  disabled={!supported}
                  onClick={() => setPending(t.id)}
                >
                  {supported
                    ? current
                      ? 'Reset to template content'
                      : 'Use this template'
                    : `Not available in ${ratio}`}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => pending && apply(pending)}
        title="Replace scenes?"
        confirmLabel="Apply template"
        message="Your current scenes will be replaced. You can undo this."
      />
    </div>
  );
};
