import { useState } from 'react';
import {
  finalizeDraft,
  parseScriptCsv,
  parseScriptJson,
  parseScriptText,
  toVideoCreatorError,
} from '@guidedreel/engine';
import type { VideoProjectDraftInput } from '@guidedreel/schema';
import { Button, Dialog, Tabs, Textarea, useToast } from '../primitives/index';
import { useEditorStore } from '../store/editor-store';
import { useHost } from '../host/HostContext';

type Mode = 'text' | 'json' | 'csv';

const PLACEHOLDERS: Record<Mode, string> = {
  text: 'Too much news, no time to read?\n\nMeet Ajako Taja.\n\nAI-powered trending stories, summarised in seconds.\n\nDownload today.',
  json: '[\n  { "type": "hook", "props": { "text": "Too much news?" }, "durationSeconds": 3 },\n  { "type": "cta", "props": { "headline": "Download today" } }\n]',
  csv: 'order,script,media,voice,duration\n1,"Too much news?","intro.mp4","voice1.mp3",4\n2,"Meet Ajako Taja","feature.jpg","voice2.mp3",5',
};

/** Paste text / JSON / CSV → scenes. Validation errors are shown inline. */
export const ImportScriptDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { platform } = useHost();
  const [mode, setMode] = useState<Mode>('text');
  const [value, setValue] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateProject = useEditorStore((s) => s.updateProject);
  const project = useEditorStore((s) => s.project);
  const select = useEditorStore((s) => s.select);
  const toast = useToast();

  const run = () => {
    if (!project) return;
    setError(null);
    try {
      const draft: VideoProjectDraftInput =
        mode === 'text'
          ? parseScriptText(value)
          : mode === 'json'
            ? parseScriptJson(value)
            : parseScriptCsv(value);
      if (!draft.scenes || draft.scenes.length === 0)
        throw new Error('No scenes found in the input');
      const built = finalizeDraft({
        ...draft,
        format: project.format,
        templateId: project.templateId,
        name: project.name,
      });
      updateProject((p) => ({
        ...p,
        scenes: replace
          ? built.scenes
          : [
              ...p.scenes,
              ...built.scenes.map((s, i) => ({
                ...s,
                transitionIn:
                  i === 0 && p.scenes.length === 0
                    ? undefined
                    : (s.transitionIn ?? p.settings.defaultTransition),
              })),
            ],
        assets: [...p.assets, ...built.assets.filter((a) => !p.assets.some((x) => x.id === a.id))],
      }));
      const first = built.scenes[0];
      if (first) select({ kind: 'scene', sceneId: first.id });
      toast.push({
        kind: 'success',
        title: `Imported ${built.scenes.length} scene${built.scenes.length > 1 ? 's' : ''}`,
        description: built.assets.length
          ? `${built.assets.length} media reference(s) created; upload the files in Assets.`
          : undefined,
      });
      setValue('');
      onClose();
    } catch (err) {
      const e = toVideoCreatorError(err, 'IMPORT_FAILED');
      const issues = (e.details.issues as { path?: string; message: string }[] | undefined) ?? [];
      setError(
        issues.length
          ? `${e.message}: ${issues
              .slice(0, 3)
              .map((i) => `${i.path ? i.path + ' — ' : ''}${i.message}`)
              .join('; ')}`
          : e.message,
      );
    }
  };

  const loadFile = async () => {
    const [file] = await platform.pickFiles({ multiple: false });
    if (!file?.blob) return;
    const text = await file.blob.text();
    const ext = file.name.split('.').pop()?.toLowerCase();
    setMode(ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : 'text');
    setValue(text);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import script"
      description="Each paragraph, JSON entry or CSV row becomes a scene."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={run} disabled={!value.trim()}>
            Import
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            items={[
              { value: 'text', label: 'Text' },
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
            ]}
          />
          <Button size="sm" variant="outline" onClick={loadFile}>
            Load file…
          </Button>
        </div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          placeholder={PLACEHOLDERS[mode]}
          className="font-mono text-xs"
          spellCheck={false}
        />
        {mode === 'csv' ? (
          <p className="text-[11px] text-fg-muted">
            Columns:{' '}
            <code>order, type?, script, title?, media?, voice?, duration?, transition?</code>. Media
            and voice are file names; upload the actual files afterwards.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="accent-primary"
          />{' '}
          Replace existing scenes instead of appending
        </label>
        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
            {error}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
};
