import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { FORMAT_PRESET_LIST, type AspectRatio } from '@guidedreel/schema';
import { Button, Dialog, Field, Input, Badge, useToast } from '../primitives/index';
import { useHost } from '../host/HostContext';
import { cn } from '../lib/cn';
import { useLocalSetting } from '../hooks/useLocalSetting';

type Step = 0 | 1 | 2;

/** Three steps: name → format → template → open editor. */
export const NewProjectDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  presetTemplateId?: string;
}> = ({ open, onClose, presetTemplateId }) => {
  const { templates, storage, navigate } = useHost();
  const toast = useToast();
  const [defaultRatio] = useLocalSetting<AspectRatio>('defaultFormat', '9:16');
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [ratio, setRatio] = useState<AspectRatio>(defaultRatio);
  const [templateId, setTemplateId] = useState<string>(presetTemplateId ?? 'modern-promo');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setName('');
      setRatio(defaultRatio);
      setTemplateId(presetTemplateId ?? 'modern-promo');
    }
  }, [open, presetTemplateId, defaultRatio]);

  const available = useMemo(() => templates.list(), [templates]);
  const supported = available.filter((t) => t.supportedFormats.includes(ratio));
  const chosen = supported.some((t) => t.id === templateId)
    ? templateId
    : (supported[0]?.id ?? 'blank');

  const create = async () => {
    setCreating(true);
    try {
      const template = templates.require(chosen);
      const preset = FORMAT_PRESET_LIST.find((p) => p.id === ratio)!;
      const project = templates.instantiate(chosen, template.sampleInput(), {
        name: name.trim() || 'Untitled project',
        format: preset.format,
        aspectRatio: ratio,
      });
      await storage.projects.save(project);
      onClose();
      navigate({ name: 'editor', projectId: project.id });
    } catch (err) {
      toast.push({
        kind: 'error',
        title: 'Could not create project',
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New project"
      description={['Give it a name', 'Choose a format', 'Pick a template'][step]}
      size="lg"
      footer={
        <>
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <Button
              variant="primary"
              onClick={() => setStep((s) => (s + 1) as Step)}
              autoFocus={step > 0}
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="primary" onClick={create} loading={creating}>
              <Check className="h-3.5 w-3.5" /> Create project
            </Button>
          )}
        </>
      }
    >
      <ol className="mb-4 flex items-center gap-2 text-[11px]">
        {['Name', 'Format', 'Template'].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                i <= step ? 'bg-primary text-primary-fg' : 'bg-surface-3 text-fg-subtle',
              )}
            >
              {i + 1}
            </span>
            <span className={i <= step ? 'text-fg' : 'text-fg-subtle'}>{label}</span>
            {i < 2 ? <span className="mx-1 h-px w-6 bg-border" /> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Field label="Project name">
          <Input
            autoFocus
            value={name}
            placeholder="e.g. Spring launch promo"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
          />
        </Field>
      ) : null}

      {step === 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {FORMAT_PRESET_LIST.map((p) => {
            const ar = p.format.width / p.format.height;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setRatio(p.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-3 text-center',
                  ratio === p.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface-2 hover:border-border-strong',
                )}
              >
                <div className="flex h-20 items-center justify-center">
                  <div
                    className="rounded-sm bg-fg/80"
                    style={{ width: ar >= 1 ? 72 : 72 * ar, height: ar >= 1 ? 72 / ar : 72 }}
                  />
                </div>
                <div className="text-sm font-semibold">{p.id}</div>
                <div className="text-[11px] text-fg-muted">
                  {p.label}
                  <br />
                  {p.description}
                </div>
                <div className="text-[10px] text-fg-subtle">
                  {p.format.width}×{p.format.height}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid grid-cols-2 gap-3">
          {supported.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={cn(
                'flex gap-3 rounded-lg border p-3 text-left',
                chosen === t.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface-2 hover:border-border-strong',
              )}
            >
              <span
                className="mt-0.5 h-10 w-10 shrink-0 rounded-md"
                style={{ background: t.accentColor ?? 'var(--vc-primary)' }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">{t.description}</span>
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {t.typicalDurationSeconds ? <Badge>~{t.typicalDurationSeconds}s</Badge> : null}
                  {t.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
};
