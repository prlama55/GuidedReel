import { Copy, Trash2, Type, Image as ImageIcon, Lock, Mic, Wand2, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { AssetType, InspectorGroup, SceneType, TransitionType } from '@guidedreel/schema';
import { SCENE_DEFINITION_LIST, TRANSITION_OPTIONS, getSceneDefinition } from '@guidedreel/schema';
import {
  emojiFromCodepoint,
  findSticker,
  framesToSeconds,
  secondsToFrames,
} from '@guidedreel/engine';
import {
  Button,
  Field,
  Input,
  Select,
  Slider,
  Switch,
  SceneIcon,
  SectionTitle,
} from '../primitives/index';
import { useEditorStore, useSelectedOverlay, useSelectedScene } from '../store/editor-store';
import { OverlayInspector } from './OverlayInspector';
import { AssetPreview } from './AssetPreview';
import { VoiceoverDialog } from './VoiceoverDialog';
import { useHost } from '../host/HostContext';
import { useAssetImport } from '../hooks/useAssetImport';
import { AssetField, ColorField, SchemaField } from './inspector/fields';

const GROUP_ORDER: InspectorGroup[] = ['Content', 'Media', 'Timing', 'Transition', 'Style'];

export const Inspector: React.FC = () => {
  const selection = useEditorStore((s) => s.selection);
  const scene = useSelectedScene();
  const selectedOverlay = useSelectedOverlay();
  const body =
    selection.kind === 'overlay' && selectedOverlay ? (
      <OverlayInspector
        sceneId={selectedOverlay.scene.id}
        overlay={selectedOverlay.overlay}
        sceneDurationInFrames={selectedOverlay.scene.durationInFrames}
      />
    ) : selection.kind === 'scene' && scene ? (
      <SceneInspector sceneId={scene.id} />
    ) : selection.kind === 'transition' && scene ? (
      <SceneInspector sceneId={scene.id} focusTransition />
    ) : (
      <ProjectInspector />
    );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorTabs sceneId={scene?.id} />
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  );
};

/**
 * Scene / Project switch at the top of the inspector. A scene is selected
 * almost all the time, so project-wide settings (music, frame rate, default
 * transition) need an always-visible way in; switching back restores the last
 * selected scene.
 */
const InspectorTabs: React.FC<{ sceneId?: string }> = ({ sceneId }) => {
  const select = useEditorStore((s) => s.select);
  const firstSceneId = useEditorStore((s) => s.project?.scenes[0]?.id);
  const lastScene = useRef<string | undefined>(undefined);
  if (sceneId) lastScene.current = sceneId;
  const isProject = !sceneId;
  const toScene = lastScene.current ?? firstSceneId;
  const tab = (active: boolean) =>
    active
      ? 'flex-1 rounded-[6px] bg-surface-3 px-3 py-1 text-xs font-medium text-fg shadow-sm'
      : 'flex-1 rounded-[6px] px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg disabled:opacity-40';
  return (
    <div className="border-b border-border px-3 py-2" role="tablist" aria-label="Inspector">
      <div className="flex rounded-md border border-border bg-surface-2 p-0.5">
        <button
          type="button"
          role="tab"
          aria-selected={!isProject}
          disabled={!toScene}
          className={tab(!isProject)}
          onClick={() => toScene && select({ kind: 'scene', sceneId: toScene })}
        >
          Scene
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isProject}
          className={tab(isProject)}
          onClick={() => select({ kind: 'project' })}
        >
          Project
        </button>
      </div>
    </div>
  );
};

const SceneInspector: React.FC<{ sceneId: string; focusTransition?: boolean }> = ({
  sceneId,
  focusTransition,
}) => {
  const { platform, tts } = useHost();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const project = useEditorStore((s) => s.project)!;
  const scene = project.scenes.find((s) => s.id === sceneId)!;
  const index = project.scenes.findIndex((s) => s.id === sceneId);
  const updateSceneProps = useEditorStore((s) => s.updateSceneProps);
  const updateScene = useEditorStore((s) => s.updateScene);
  const setSceneDuration = useEditorStore((s) => s.setSceneDuration);
  const setSceneTransition = useEditorStore((s) => s.setSceneTransition);
  const setSceneVoiceover = useEditorStore((s) => s.setSceneVoiceover);
  const changeSceneType = useEditorStore((s) => s.changeSceneType);
  const removeScene = useEditorStore((s) => s.removeScene);
  const duplicateScene = useEditorStore((s) => s.duplicateScene);
  const cropScene = useEditorStore((s) => s.cropScene);
  const addOverlay = useEditorStore((s) => s.addOverlay);
  const select = useEditorStore((s) => s.select);
  const openRecorder = useEditorStore((s) => s.openRecorder);
  const { importFiles } = useAssetImport();
  const def = getSceneDefinition(scene.type);
  const fps = project.format.fps;

  const groups = useMemo(() => {
    const map = new Map<InspectorGroup, typeof def.inspector>();
    for (const f of def.inspector) map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return map;
  }, [def]);

  const upload = async (types: AssetType[], key: string) => {
    const preferred = types.length === 1 ? types[0] : undefined;
    const [asset] = await importFiles(
      await platform.pickFiles({ multiple: false, assetTypes: types }),
      preferred,
    );
    if (!asset) return;
    updateSceneProps(scene.id, { [key]: asset.id });
    // New primary media: open Crop mode so it can be framed right away.
    if (key === def.mediaKey) cropScene(scene.id);
  };

  const voiceover = project.assets.find((a) => a.id === scene.voiceoverAssetId);
  const seconds = framesToSeconds(scene.durationInFrames, fps);
  const minSeconds = def.minDurationSeconds;

  return (
    <div className="flex h-full flex-col">
      <div
        className={`vc-scene-${scene.type} flex items-center gap-2 border-b border-border px-3 py-2.5`}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded"
          style={{
            background: 'color-mix(in srgb, var(--scene-color) 22%, transparent)',
            color: 'var(--scene-color)',
          }}
        >
          <SceneIcon type={scene.type} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <Input
            value={scene.title ?? ''}
            placeholder={def.label}
            onChange={(e) => updateScene(scene.id, { title: e.target.value || undefined })}
            className="h-7 border-transparent bg-transparent px-1 text-sm font-semibold hover:border-border"
            aria-label="Scene title"
          />
          <div className="px-1 text-[10px] text-fg-subtle">
            Scene {index + 1} · {def.label}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => duplicateScene(scene.id)}
          aria-label="Duplicate scene"
          title="Duplicate (⌘D)"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => removeScene(scene.id)}
          aria-label="Delete scene"
          title="Delete"
          className="hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <Group title="Scene">
          <Field label="Type" description="Props the new type also has are kept.">
            <Select
              value={scene.type}
              onChange={(e) => changeSceneType(scene.id, e.target.value as SceneType)}
            >
              {SCENE_DEFINITION_LIST.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        </Group>

        <Group title="Overlays">
          <p className="text-[11px] text-fg-muted">
            Free-positioned text, stickers and media on top of this scene. Click one to edit it, or
            drag it in the preview.
          </p>
          {scene.overlays.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {scene.overlays.map((o, i) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: 'overlay', sceneId: scene.id, overlayId: o.id })}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-left text-xs hover:border-border-strong"
                  >
                    <span className="text-fg-subtle">{i + 1}</span>
                    <span className="flex h-5 w-7 items-center justify-center text-fg-muted">
                      {o.kind === 'text' ? (
                        <Type className="h-3.5 w-3.5" />
                      ) : o.kind === 'emoji' ? (
                        <span className="text-sm leading-none">
                          {emojiFromCodepoint(o.codepoint)}
                        </span>
                      ) : (
                        <AssetPreview
                          assetId={o.assetId}
                          className="h-5 w-7"
                          fit="cover"
                          fallback={<ImageIcon className="h-3.5 w-3.5" />}
                        />
                      )}
                    </span>
                    <span className="truncate">
                      {o.kind === 'text'
                        ? o.text || 'Text'
                        : o.kind === 'emoji'
                          ? `Sticker · ${findSticker(o.codepoint)?.name ?? o.codepoint}`
                          : (project.assets.find((a) => a.id === o.assetId)?.name ?? 'Media')}
                    </span>
                    {o.locked ? <Lock className="ml-auto h-3 w-3 text-fg-subtle" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                addOverlay(scene.id, {
                  kind: 'text',
                  text: 'Your text',
                  x: 0.5,
                  y: 0.5,
                  width: 0.7,
                })
              }
            >
              + Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const [a] = await importFiles(
                  await platform.pickFiles({
                    multiple: false,
                    assetTypes: ['image', 'video', 'logo'],
                  }),
                );
                if (!a) return;
                const aspect = a.width && a.height ? a.height / a.width : 1;
                const width = 0.4;
                addOverlay(scene.id, {
                  kind: 'media',
                  assetId: a.id,
                  x: 0.5,
                  y: 0.5,
                  width,
                  height: Math.min(
                    1,
                    (width * project.format.width * aspect) / project.format.height,
                  ),
                });
              }}
            >
              + Media
            </Button>
          </div>
        </Group>

        {GROUP_ORDER.filter((g) => g !== 'Timing' && g !== 'Transition').map((g) => {
          const fields = groups.get(g);
          if (!fields?.length) return null;
          return (
            <Group key={g} title={g}>
              {fields.map((f) => (
                <SchemaField
                  key={f.key}
                  field={f}
                  value={scene.props[f.key]}
                  assets={project.assets}
                  onChange={(v) => updateSceneProps(scene.id, { [f.key]: v })}
                  onUpload={(types) => upload(types, f.key)}
                  onCrop={f.key === def.mediaKey ? () => cropScene(scene.id) : undefined}
                />
              ))}
            </Group>
          );
        })}

        <Group title="Timing">
          <Field
            label="Duration"
            hint={`${seconds.toFixed(1)}s · ${scene.durationInFrames}f`}
            description={
              scene.durationMode === 'fromAudio'
                ? 'Following the voiceover length.'
                : `Minimum ${minSeconds}s for this scene type.`
            }
          >
            <div className="flex items-center gap-2">
              <Slider
                value={Math.min(30, seconds)}
                min={minSeconds}
                max={30}
                step={0.5}
                onChange={(v) => setSceneDuration(scene.id, secondsToFrames(v, fps))}
                disabled={scene.durationMode === 'fromAudio'}
                aria-label="Duration in seconds"
              />
              <Input
                type="number"
                min={minSeconds}
                step={0.5}
                value={Number(seconds.toFixed(1))}
                onChange={(e) =>
                  setSceneDuration(scene.id, secondsToFrames(Number(e.target.value), fps))
                }
                disabled={scene.durationMode === 'fromAudio'}
                className="w-20"
                aria-label="Duration"
              />
            </div>
          </Field>
          <AssetField
            label="Voiceover"
            value={scene.voiceoverAssetId}
            assets={project.assets}
            assetTypes={['voiceover', 'audio']}
            onChange={(v) => setSceneVoiceover(scene.id, v)}
            onUpload={async () => {
              const [a] = await importFiles(
                await platform.pickFiles({ multiple: false, assetTypes: ['voiceover'] }),
                'voiceover',
              );
              if (a) setSceneVoiceover(scene.id, a.id);
            }}
            description={
              voiceover?.duration ? `Clip length ${voiceover.duration.toFixed(1)}s` : undefined
            }
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openRecorder(scene.id)}>
              <Mic className="h-3.5 w-3.5" /> Record
            </Button>
            {tts ? (
              <Button size="sm" variant="outline" onClick={() => setVoiceOpen(true)}>
                <Sparkles className="h-3.5 w-3.5" /> Generate voiceover
              </Button>
            ) : null}
          </div>
          {scene.voiceoverAssetId ? (
            <>
              <div className="flex items-center justify-between py-1 text-xs">
                <span className="font-medium text-fg-muted">Fit scene to voiceover</span>
                <Switch
                  checked={scene.durationMode === 'fromAudio'}
                  onCheckedChange={(v) =>
                    updateScene(scene.id, { durationMode: v ? 'fromAudio' : 'fixed' })
                  }
                  aria-label="Fit scene to voiceover"
                />
              </div>
              {scene.durationMode === 'fromAudio' ? (
                <Field
                  label="Padding after audio"
                  hint={`${(scene.audioPaddingFrames / fps).toFixed(1)}s`}
                >
                  <Slider
                    value={scene.audioPaddingFrames}
                    min={0}
                    max={fps * 3}
                    step={1}
                    onChange={(v) => updateScene(scene.id, { audioPaddingFrames: v })}
                    aria-label="Audio padding"
                  />
                </Field>
              ) : null}
            </>
          ) : null}
        </Group>

        {index > 0 ? (
          <Group title="Transition in" highlight={focusTransition}>
            <Field label="Type">
              <Select
                value={scene.transitionIn?.type ?? 'none'}
                onChange={(e) => {
                  const type = e.target.value as TransitionType;
                  setSceneTransition(
                    scene.id,
                    type === 'none'
                      ? undefined
                      : {
                          type,
                          durationInFrames:
                            scene.transitionIn?.durationInFrames ||
                            project.settings.defaultTransition.durationInFrames ||
                            12,
                        },
                  );
                }}
              >
                {TRANSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            {scene.transitionIn && scene.transitionIn.type !== 'none' ? (
              <Field
                label="Duration"
                hint={`${(scene.transitionIn.durationInFrames / fps).toFixed(2)}s`}
              >
                <Slider
                  value={scene.transitionIn.durationInFrames}
                  min={2}
                  max={Math.min(fps * 2, scene.durationInFrames - 1)}
                  step={1}
                  onChange={(v) =>
                    setSceneTransition(scene.id, { ...scene.transitionIn!, durationInFrames: v })
                  }
                  aria-label="Transition duration"
                />
              </Field>
            ) : null}
          </Group>
        ) : null}
      </div>
      {tts ? (
        <VoiceoverDialog open={voiceOpen} onClose={() => setVoiceOpen(false)} sceneId={sceneId} />
      ) : null}
    </div>
  );
};

const ProjectInspector: React.FC = () => {
  const { platform, tts } = useHost();
  const openMusic = useEditorStore((s) => s.openMusic);
  const [voiceAllOpen, setVoiceAllOpen] = useState(false);
  const project = useEditorStore((s) => s.project)!;
  const updateProject = useEditorStore((s) => s.updateProject);
  const { importFiles } = useAssetImport();
  const fps = project.format.fps;
  const music = project.assets.find((a) => a.id === project.audio.musicAssetId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        <div className="text-sm font-semibold">Project</div>
        <div className="text-[10px] text-fg-subtle">
          Music, frame rate and defaults for the whole video. Select a scene to edit its content.
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-6">
        <Group title="Video">
          <Field label="Frame rate">
            <Select
              value={fps}
              onChange={(e) =>
                updateProject((p) => ({
                  ...p,
                  format: { ...p.format, fps: Number(e.target.value) },
                }))
              }
            >
              {[24, 25, 30, 60].map((f) => (
                <option key={f} value={f}>
                  {f} fps
                </option>
              ))}
            </Select>
          </Field>
          <ColorField
            label="Background colour"
            value={project.settings.backgroundColor}
            onChange={(v) =>
              updateProject((p) => ({
                ...p,
                settings: { ...p.settings, backgroundColor: v || '#0B0F19' },
              }))
            }
          />
          <Field
            label="Font family"
            description="Used when no brand font is set. Needs to be installed or a web font available at render time."
          >
            <Input
              value={project.settings.fontFamily}
              onChange={(e) =>
                updateProject((p) => ({
                  ...p,
                  settings: { ...p.settings, fontFamily: e.target.value },
                }))
              }
            />
          </Field>
        </Group>
        <Group title="Default transition">
          <Field label="Type">
            <Select
              value={project.settings.defaultTransition.type}
              onChange={(e) =>
                updateProject((p) => ({
                  ...p,
                  settings: {
                    ...p.settings,
                    defaultTransition: {
                      ...p.settings.defaultTransition,
                      type: e.target.value as TransitionType,
                    },
                  },
                }))
              }
            >
              {TRANSITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Duration"
            hint={`${(project.settings.defaultTransition.durationInFrames / fps).toFixed(2)}s`}
          >
            <Slider
              value={project.settings.defaultTransition.durationInFrames}
              min={0}
              max={fps * 2}
              step={1}
              onChange={(v) =>
                updateProject((p) => ({
                  ...p,
                  settings: {
                    ...p.settings,
                    defaultTransition: { ...p.settings.defaultTransition, durationInFrames: v },
                  },
                }))
              }
              aria-label="Default transition duration"
            />
          </Field>
        </Group>
        <Group title="Music">
          <Button variant="primary" size="sm" onClick={() => openMusic(true)}>
            <Wand2 className="h-3.5 w-3.5" /> Generate music from scenes…
          </Button>
          <AssetField
            label="Background music"
            value={project.audio.musicAssetId}
            assets={project.assets}
            assetTypes={['music', 'audio']}
            onChange={(v) =>
              updateProject((p) => ({ ...p, audio: { ...p.audio, musicAssetId: v } }))
            }
            onUpload={async () => {
              const [a] = await importFiles(
                await platform.pickFiles({ multiple: false, assetTypes: ['music'] }),
                'music',
              );
              if (a) updateProject((p) => ({ ...p, audio: { ...p.audio, musicAssetId: a.id } }));
            }}
            description={
              music?.duration ? `Loops; clip is ${music.duration.toFixed(0)}s` : undefined
            }
          />
          <Field label="Music volume" hint={`${Math.round(project.audio.musicVolume * 100)}%`}>
            <Slider
              value={project.audio.musicVolume}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) =>
                updateProject((p) => ({ ...p, audio: { ...p.audio, musicVolume: v } }))
              }
              aria-label="Music volume"
            />
          </Field>
          <div className="flex items-center justify-between py-1 text-xs">
            <span className="font-medium text-fg-muted">Duck music under voiceover</span>
            <Switch
              checked={project.audio.duckMusic}
              onCheckedChange={(v) =>
                updateProject((p) => ({ ...p, audio: { ...p.audio, duckMusic: v } }))
              }
              aria-label="Duck music"
            />
          </div>
          {tts ? (
            <Button variant="outline" size="sm" onClick={() => setVoiceAllOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Generate voiceovers for all scenes…
            </Button>
          ) : null}
          <Field
            label="Voiceover volume"
            hint={`${Math.round(project.audio.voiceoverVolume * 100)}%`}
          >
            <Slider
              value={project.audio.voiceoverVolume}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) =>
                updateProject((p) => ({ ...p, audio: { ...p.audio, voiceoverVolume: v } }))
              }
              aria-label="Voiceover volume"
            />
          </Field>
        </Group>
      </div>
      {tts ? <VoiceoverDialog open={voiceAllOpen} onClose={() => setVoiceAllOpen(false)} /> : null}
    </div>
  );
};

const Group: React.FC<{ title: string; children: React.ReactNode; highlight?: boolean }> = ({
  title,
  children,
  highlight,
}) => (
  <section className={highlight ? 'bg-primary/5' : undefined}>
    <SectionTitle>{title}</SectionTitle>
    <div className="flex flex-col gap-3 px-3 pb-3">{children}</div>
  </section>
);
