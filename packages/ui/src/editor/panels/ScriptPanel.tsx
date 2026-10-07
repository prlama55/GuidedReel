import { FileUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getSceneDefinition } from '@guidedreel/schema';
import { Button, SectionTitle, Textarea, SceneIcon, EmptyState } from '../../primitives/index';
import { useEditorStore } from '../../store/editor-store';
import { cn } from '../../lib/cn';
import { ImportScriptDialog } from '../ImportScriptDialog';

/**
 * One text block per scene. Editing writes to the scene type's scriptKey, so
 * the script and the scenes are always the same structure.
 */
export const ScriptPanel: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const updateSceneProps = useEditorStore((s) => s.updateSceneProps);
  const addScene = useEditorStore((s) => s.addScene);
  const removeScene = useEditorStore((s) => s.removeScene);
  const [importOpen, setImportOpen] = useState(false);
  if (!project) return null;

  return (
    <div className="flex h-full flex-col">
      <SectionTitle
        right={
          <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
            <FileUp className="h-3.5 w-3.5" /> Import
          </Button>
        }
      >
        Script
      </SectionTitle>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {project.scenes.length === 0 ? (
          <EmptyState
            title="Write your script"
            description="Paste text, JSON or CSV. Each paragraph becomes a scene."
            action={
              <Button variant="primary" size="sm" onClick={() => setImportOpen(true)}>
                <FileUp className="h-3.5 w-3.5" /> Import script
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {project.scenes.map((scene, i) => {
              const def = getSceneDefinition(scene.type);
              const key = def.scriptKey;
              const value = key ? String(scene.props[key] ?? '') : '';
              const isSelected = selection.kind === 'scene' && selection.sceneId === scene.id;
              return (
                <li
                  key={scene.id}
                  className={cn(
                    'vc-scene-' + scene.type,
                    'rounded-md border p-2',
                    isSelected ? 'border-primary/60 bg-primary/5' : 'border-border',
                  )}
                  onFocus={() => select({ kind: 'scene', sceneId: scene.id })}
                >
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold"
                      style={{
                        background: 'color-mix(in srgb, var(--scene-color) 22%, transparent)',
                        color: 'var(--scene-color)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <SceneIcon type={scene.type} className="h-3 w-3" />
                    <span className="font-medium">{scene.title ?? def.label}</span>
                    <button
                      type="button"
                      className="ml-auto rounded p-0.5 text-fg-subtle hover:text-danger"
                      onClick={() => removeScene(scene.id)}
                      aria-label="Remove scene"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  {key ? (
                    <Textarea
                      value={value}
                      rows={2}
                      onChange={(e) => updateSceneProps(scene.id, { [key]: e.target.value })}
                      placeholder={`${def.label} text…`}
                      className="text-[13px]"
                    />
                  ) : (
                    <p className="text-[11px] text-fg-subtle">
                      This scene type has no script text.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => addScene('text')}
        >
          <Plus className="h-3.5 w-3.5" /> Add paragraph
        </Button>
      </div>
      <ImportScriptDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
