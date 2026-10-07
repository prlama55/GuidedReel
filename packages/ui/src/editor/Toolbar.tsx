import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Download,
  Loader2,
  Redo2,
  Undo2,
  AlertTriangle,
  Keyboard,
  Grid2x2,
  Music2,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import {
  FORMAT_PRESET_LIST,
  aspectRatioOf,
  type AspectRatio,
  FORMAT_PRESETS,
} from '@guidedreel/schema';
import { formatDuration, calculateTimeline } from '@guidedreel/engine';
import { Button, Input, Select, Badge } from '../primitives/index';
import { useHost } from '../host/HostContext';
import { redo, undo, useEditorStore } from '../store/editor-store';
import { useHistoryState } from '../store/useTemporal';
import { isMac, modKey } from '../lib/format';
import { cn } from '../lib/cn';

export const Toolbar: React.FC<{ onExport: () => void; onShowShortcuts: () => void }> = ({
  onExport,
  onShowShortcuts,
}) => {
  const { navigate, platform } = useHost();
  const project = useEditorStore((s) => s.project);
  const saveState = useEditorStore((s) => s.saveState);
  const problems = useEditorStore((s) => s.problems);
  const showProblems = useEditorStore((s) => s.showProblems);
  const toggleProblems = useEditorStore((s) => s.toggleProblems);
  const rename = useEditorStore((s) => s.rename);
  const updateProject = useEditorStore((s) => s.updateProject);
  const openMusic = useEditorStore((s) => s.openMusic);
  const { canUndo, canRedo } = useHistoryState();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  if (!project) return null;
  const ratio = aspectRatioOf(project.format);
  const total = calculateTimeline(project).totalFrames;
  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.length - errors;

  return (
    <div
      data-vc-titlebar
      className={cn(
        'flex h-12 items-center gap-2 border-b border-border bg-surface px-2',
        platform.name === 'desktop' && isMac && 'pl-[76px]',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate({ name: 'projects' })}
        aria-label="Back to projects"
        title="Back to projects"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        {editingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              rename(draftName);
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                rename(draftName);
                setEditingName(false);
              }
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="h-7 w-56 text-sm font-medium"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftName(project.name);
              setEditingName(true);
            }}
            className="truncate rounded px-1.5 py-0.5 text-sm font-semibold hover:bg-surface-3"
            title="Rename project"
          >
            {project.name}
          </button>
        )}
        <SaveIndicator state={saveState} />
      </div>

      <div className="mx-2 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={!canUndo}
        aria-label="Undo"
        title={`Undo (${modKey}Z)`}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={redo}
        disabled={!canRedo}
        aria-label="Redo"
        title={`Redo (⇧${modKey}Z)`}
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <span className="hidden text-xs text-fg-muted sm:inline" title="Total duration">
        {formatDuration(total, project.format.fps)}
      </span>
      <div className="w-[160px]">
        <Select
          value={ratio}
          onChange={(e) => {
            const next = FORMAT_PRESETS[e.target.value as AspectRatio];
            updateProject((p) => ({ ...p, format: { ...next.format, fps: p.format.fps } }));
          }}
          className="h-8 text-xs"
          aria-label="Video format"
        >
          {FORMAT_PRESET_LIST.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {p.label}
            </option>
          ))}
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openMusic(true)}
        title="Generate background music from the scenes"
      >
        <Music2 className="h-3.5 w-3.5" /> Music
      </Button>
      <Button
        variant={showProblems ? 'secondary' : 'ghost'}
        size="sm"
        onClick={toggleProblems}
        className={cn(errors > 0 && 'text-danger', errors === 0 && warnings > 0 && 'text-warning')}
        title="Problems"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {problems.length > 0 ? problems.length : null}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate({ name: 'settings' })}
        aria-label="Settings"
        title="Settings (theme, defaults, voice providers)"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onShowShortcuts}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={onExport}
        disabled={project.scenes.length === 0}
        title={`Export video (${modKey}E)`}
      >
        <Download className="h-3.5 w-3.5" /> Export
      </Button>
      <span className="sr-only">
        <Grid2x2 />
      </span>
    </div>
  );
};

const SaveIndicator: React.FC<{ state: 'saved' | 'saving' | 'unsaved' | 'error' }> = ({
  state,
}) => {
  if (state === 'saving')
    return (
      <Badge tone="neutral">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Saving…
      </Badge>
    );
  if (state === 'unsaved')
    return (
      <Badge tone="warning">
        <CloudOff className="mr-1 h-3 w-3" />
        Unsaved
      </Badge>
    );
  if (state === 'error')
    return (
      <Badge tone="danger">
        <CloudOff className="mr-1 h-3 w-3" />
        Save failed
      </Badge>
    );
  return (
    <Badge tone="success">
      <Check className="mr-1 h-3 w-3" />
      Saved
      <Cloud className="sr-only" />
    </Badge>
  );
};
