import type {
  Asset,
  Overlay,
  OverlayDraft,
  SceneType,
  TransitionConfig,
  VideoProject,
  VideoScene,
} from '@guidedreel/schema';
import { OverlaySchema } from '@guidedreel/schema';
import { getSceneDefinition, isSceneType } from '@guidedreel/schema';
import { createId } from './ids';
import { createScene, type CreateSceneOptions } from './project-factory';
import { minSceneFrames } from './durations';

/**
 * Pure, immutable project operations. The editor store and importers compose
 * these; they contain the business rules so the UI does not have to.
 */

export function addScene(
  project: VideoProject,
  type: SceneType,
  index?: number,
  options: CreateSceneOptions = {},
): { project: VideoProject; scene: VideoScene } {
  const transitionIn =
    options.transitionIn ??
    (project.scenes.length > 0 ? project.settings.defaultTransition : undefined);
  const scene = createScene(type, project.format.fps, { ...options, transitionIn });
  const scenes = [...project.scenes];
  const at = index === undefined ? scenes.length : Math.max(0, Math.min(scenes.length, index));
  scenes.splice(at, 0, scene);
  return { project: { ...project, scenes }, scene };
}

export function removeScene(project: VideoProject, sceneId: string): VideoProject {
  return { ...project, scenes: project.scenes.filter((s) => s.id !== sceneId) };
}

export function moveScene(project: VideoProject, sceneId: string, toIndex: number): VideoProject {
  const from = project.scenes.findIndex((s) => s.id === sceneId);
  if (from === -1) return project;
  const scenes = [...project.scenes];
  const [scene] = scenes.splice(from, 1);
  const clampedTo = Math.max(0, Math.min(scenes.length, toIndex));
  scenes.splice(clampedTo, 0, scene!);
  return { ...project, scenes };
}

export function duplicateScene(
  project: VideoProject,
  sceneId: string,
): { project: VideoProject; scene: VideoScene | undefined } {
  const index = project.scenes.findIndex((s) => s.id === sceneId);
  const source = project.scenes[index];
  if (!source) return { project, scene: undefined };
  const copy: VideoScene = {
    ...source,
    id: createId('sc'),
    props: { ...source.props },
    title: source.title ? `${source.title} copy` : undefined,
  };
  const scenes = [...project.scenes];
  scenes.splice(index + 1, 0, copy);
  return { project: { ...project, scenes }, scene: copy };
}

export function updateScene(
  project: VideoProject,
  sceneId: string,
  patch: Partial<Omit<VideoScene, 'id' | 'type' | 'props'>>,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
  };
}

/** Merges a props patch and re-validates against the scene's schema. Invalid patches throw. */
export function updateSceneProps(
  project: VideoProject,
  sceneId: string,
  patch: Record<string, unknown>,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      if (!isSceneType(s.type)) return s;
      const def = getSceneDefinition(s.type);
      const next = def.propsSchema.parse({ ...s.props, ...patch }) as Record<string, unknown>;
      return { ...s, props: next };
    }),
  };
}

export function setSceneDuration(
  project: VideoProject,
  sceneId: string,
  durationInFrames: number,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const min = minSceneFrames(s, project.format.fps);
      const dur = Math.max(min, Math.round(durationInFrames));
      // Keep the transition shorter than the scene.
      const transitionIn =
        s.transitionIn && s.transitionIn.durationInFrames >= dur
          ? { ...s.transitionIn, durationInFrames: Math.max(0, dur - 1) }
          : s.transitionIn;
      return { ...s, durationInFrames: dur, durationMode: 'fixed', transitionIn };
    }),
  };
}

/**
 * Splits a scene at `atFrame` (relative to the scene start) into two scenes
 * with the same content. The second part starts with a hard cut. Returns the
 * project unchanged when either part would be shorter than the type minimum.
 */
export function splitScene(
  project: VideoProject,
  sceneId: string,
  atFrame: number,
): { project: VideoProject; secondId: string | undefined } {
  const index = project.scenes.findIndex((s) => s.id === sceneId);
  const scene = project.scenes[index];
  if (!scene) return { project, secondId: undefined };
  const min = minSceneFrames(scene, project.format.fps);
  const first = Math.round(atFrame);
  const second = scene.durationInFrames - first;
  if (first < min || second < min) return { project, secondId: undefined };
  const secondId = createId('sc');
  const a: VideoScene = { ...scene, durationInFrames: first, durationMode: 'fixed' };
  const b: VideoScene = {
    ...scene,
    id: secondId,
    durationInFrames: second,
    durationMode: 'fixed',
    transitionIn: undefined,
    props: { ...scene.props },
    overlays: scene.overlays.map((o) => ({ ...o, id: createId('ov') })),
    title: scene.title ? `${scene.title} (2)` : undefined,
  };
  const scenes = [...project.scenes];
  scenes.splice(index, 1, a, b);
  return { project: { ...project, scenes }, secondId };
}

export function setSceneTransition(
  project: VideoProject,
  sceneId: string,
  transition: TransitionConfig | undefined,
): VideoProject {
  return updateScene(project, sceneId, { transitionIn: transition });
}

/** Changes the scene type while keeping any props the new type also has. */
export function changeSceneType(
  project: VideoProject,
  sceneId: string,
  type: SceneType,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const def = getSceneDefinition(type);
      const shape = (def.propsSchema as unknown as { shape?: Record<string, unknown> }).shape ?? {};
      const defaults = def.defaultProps();
      const kept: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        if (!(key in s.props)) continue;
        // Keep the old value only if the new type accepts it on its own.
        const probe = def.propsSchema.safeParse({ ...defaults, [key]: s.props[key] });
        if (probe.success) kept[key] = s.props[key];
      }
      const props = def.propsSchema.parse({ ...defaults, ...kept }) as Record<string, unknown>;
      return {
        ...s,
        type,
        props,
        durationInFrames: Math.max(
          minSceneFrames({ type }, project.format.fps),
          s.durationInFrames,
        ),
      };
    }),
  };
}

export function addAsset(project: VideoProject, asset: Asset): VideoProject {
  if (project.assets.some((a) => a.id === asset.id)) {
    return { ...project, assets: project.assets.map((a) => (a.id === asset.id ? asset : a)) };
  }
  return { ...project, assets: [...project.assets, asset] };
}

/** Removes an asset and clears every reference to it. */
export function removeAsset(project: VideoProject, assetId: string): VideoProject {
  const scenes = project.scenes.map((s) => {
    let changed = false;
    const props = { ...s.props };
    for (const [k, v] of Object.entries(props)) {
      if (v === assetId) {
        delete props[k];
        changed = true;
      }
    }
    const voiceoverAssetId = s.voiceoverAssetId === assetId ? undefined : s.voiceoverAssetId;
    const overlays = s.overlays.filter((o) => !(o.kind === 'media' && o.assetId === assetId));
    if (overlays.length !== s.overlays.length) changed = true;
    if (!changed && voiceoverAssetId === s.voiceoverAssetId) return s;
    return {
      ...s,
      props,
      overlays,
      voiceoverAssetId,
      durationMode: voiceoverAssetId ? s.durationMode : 'fixed',
    };
  });
  const audio =
    project.audio.musicAssetId === assetId
      ? { ...project.audio, musicAssetId: undefined }
      : project.audio;
  return { ...project, scenes, audio, assets: project.assets.filter((a) => a.id !== assetId) };
}

export function setSceneVoiceover(
  project: VideoProject,
  sceneId: string,
  assetId: string | undefined,
): VideoProject {
  return updateScene(project, sceneId, {
    voiceoverAssetId: assetId,
    durationMode: assetId ? 'fromAudio' : 'fixed',
  });
}

export function renameProject(project: VideoProject, name: string): VideoProject {
  return { ...project, name: name.trim() || project.name };
}

/* ------------------------------------------------------------------------ */
/* Overlays                                                                  */
/* ------------------------------------------------------------------------ */

/** Adds a validated overlay on top of a scene and returns it. */
export function addOverlay(
  project: VideoProject,
  sceneId: string,
  input: OverlayDraft,
): { project: VideoProject; overlay: Overlay | undefined } {
  let created: Overlay | undefined;
  const scenes = project.scenes.map((s) => {
    if (s.id !== sceneId) return s;
    created = OverlaySchema.parse({ ...input, id: input.id ?? createId('ov') });
    return { ...s, overlays: [...s.overlays, created] };
  });
  return { project: created ? { ...project, scenes } : project, overlay: created };
}

/** Merges a patch into an overlay and re-validates it. Invalid patches throw. */
export function updateOverlay(
  project: VideoProject,
  sceneId: string,
  overlayId: string,
  patch: Partial<Overlay>,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) =>
      s.id !== sceneId
        ? s
        : {
            ...s,
            overlays: s.overlays.map((o) =>
              o.id === overlayId ? OverlaySchema.parse({ ...o, ...patch, kind: o.kind }) : o,
            ),
          },
    ),
  };
}

export function removeOverlay(
  project: VideoProject,
  sceneId: string,
  overlayId: string,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) =>
      s.id !== sceneId ? s : { ...s, overlays: s.overlays.filter((o) => o.id !== overlayId) },
    ),
  };
}

export function duplicateOverlay(
  project: VideoProject,
  sceneId: string,
  overlayId: string,
): { project: VideoProject; overlay: Overlay | undefined } {
  let created: Overlay | undefined;
  const scenes = project.scenes.map((s) => {
    if (s.id !== sceneId) return s;
    const src = s.overlays.find((o) => o.id === overlayId);
    if (!src) return s;
    created = {
      ...src,
      id: createId('ov'),
      x: Math.min(1.5, src.x + 0.04),
      y: Math.min(1.5, src.y + 0.04),
    };
    return { ...s, overlays: [...s.overlays, created] };
  });
  return { project: created ? { ...project, scenes } : project, overlay: created };
}

/** Moves an overlay one step up (+1) or down (-1) in the z-order. */
export function reorderOverlay(
  project: VideoProject,
  sceneId: string,
  overlayId: string,
  direction: 1 | -1,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const i = s.overlays.findIndex((o) => o.id === overlayId);
      const j = i + direction;
      if (i === -1 || j < 0 || j >= s.overlays.length) return s;
      const overlays = [...s.overlays];
      [overlays[i], overlays[j]] = [overlays[j]!, overlays[i]!];
      return { ...s, overlays };
    }),
  };
}
