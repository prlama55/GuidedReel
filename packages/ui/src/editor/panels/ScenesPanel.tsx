import { Plus } from 'lucide-react';
import { useState } from 'react';
import { SCENE_DEFINITION_LIST, type SceneType, getSceneDefinition } from '@guidedreel/schema';
import { formatSeconds } from '../../lib/format';
import { Button, SectionTitle, SceneIcon, EmptyState, Badge } from '../../primitives/index';
import { useEditorStore } from '../../store/editor-store';
import { cn } from '../../lib/cn';
import { AssetPreview, scenePreviewAssetId } from '../AssetPreview';

export const SceneTypePicker: React.FC<{
  onPick: (type: SceneType) => void;
  compact?: boolean;
}> = ({ onPick, compact }) => (
  <div className={cn('grid gap-1.5', compact ? 'grid-cols-5' : 'grid-cols-2')}>
    {SCENE_DEFINITION_LIST.map((def) => (
      <button
        key={def.type}
        type="button"
        onClick={() => onPick(def.type as SceneType)}
        title={def.description}
        className={cn(
          'vc-scene-' + def.type,
          'group flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2 text-left text-xs hover:border-border-strong hover:bg-surface-3',
          compact && 'flex-col justify-center gap-1 p-1.5 text-[10px]',
        )}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
          style={{
            background: 'color-mix(in srgb, var(--scene-color) 20%, transparent)',
            color: 'var(--scene-color)',
          }}
        >
          <SceneIcon type={def.type as SceneType} className="h-3.5 w-3.5" />
        </span>
        <span className="truncate font-medium">{def.label}</span>
      </button>
    ))}
  </div>
);

export const ScenesPanel: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const addScene = useEditorStore((s) => s.addScene);
  const problems = useEditorStore((s) => s.problems);
  const [adding, setAdding] = useState(false);
  if (!project) return null;
  const fps = project.format.fps;

  return (
    <div className="flex h-full flex-col">
      <SectionTitle
        right={
          <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        }
      >
        Scenes · {project.scenes.length}
      </SectionTitle>
      {adding ? (
        <div className="border-b border-border px-3 pb-3">
          <SceneTypePicker
            onPick={(t) => {
              addScene(t);
              setAdding(false);
            }}
          />
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto p-2">
        {project.scenes.length === 0 ? (
          <EmptyState
            title="No scenes yet"
            description="Add a scene or paste a script in the Script panel."
            action={
              <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" /> Add scene
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-1">
            {project.scenes.map((scene, i) => {
              const def = getSceneDefinition(scene.type);
              const isSelected =
                (selection.kind === 'scene' || selection.kind === 'overlay') &&
                selection.sceneId === scene.id;
              const text = def.scriptKey ? scene.props[def.scriptKey] : undefined;
              const sceneProblems = problems.filter((p) => p.sceneId === scene.id);
              return (
                <li key={scene.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: 'scene', sceneId: scene.id })}
                    className={cn(
                      'vc-scene-' + scene.type,
                      'flex w-full items-start gap-2.5 rounded-md border p-2 text-left transition-colors',
                      isSelected
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-transparent hover:bg-surface-2',
                    )}
                  >
                    <span className="relative mt-0.5 shrink-0">
                      <AssetPreview
                        assetId={scenePreviewAssetId(scene)}
                        className="h-12 w-9"
                        fit="cover"
                        fallback={
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold"
                            style={{
                              background: 'color-mix(in srgb, var(--scene-color) 22%, transparent)',
                              color: 'var(--scene-color)',
                            }}
                          >
                            {i + 1}
                          </span>
                        }
                      />
                      {scenePreviewAssetId(scene) ? (
                        <span
                          className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded px-1 text-[9px] font-semibold"
                          style={{ background: 'var(--scene-color)', color: '#fff' }}
                        >
                          {i + 1}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <SceneIcon type={scene.type} className="h-3 w-3 opacity-70" />
                        <span className="truncate">{scene.title ?? def.label}</span>
                        <span className="ml-auto text-[10px] text-fg-subtle tabular-nums">
                          {formatSeconds(scene.durationInFrames / fps)}
                        </span>
                      </span>
                      {typeof text === 'string' && text ? (
                        <span className="mt-0.5 line-clamp-2 block text-[11px] text-fg-muted">
                          {text}
                        </span>
                      ) : null}
                      {sceneProblems.length > 0 ? (
                        <span className="mt-1 block">
                          <Badge
                            tone={
                              sceneProblems.some((p) => p.severity === 'error')
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {sceneProblems.length} issue{sceneProblems.length > 1 ? 's' : ''}
                          </Badge>
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
};
