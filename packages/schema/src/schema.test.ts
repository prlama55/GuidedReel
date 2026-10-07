import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  FORMAT_PRESETS,
  SCENE_DEFINITION_LIST,
  VideoProjectSchema,
  aspectRatioOf,
  getSceneDefinition,
  migrateProjectDocument,
  parseProjectDocument,
  sceneAssetIds,
  validateProject,
  type VideoProjectInput,
} from './index';

const now = new Date().toISOString();

function baseProject(overrides: Partial<VideoProjectInput> = {}): VideoProjectInput {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'p1',
    name: 'Test',
    format: FORMAT_PRESETS['9:16'].format,
    templateId: 'modern-promo',
    scenes: [
      { id: 's1', type: 'intro', durationInFrames: 90, props: { title: 'Hi' } },
      {
        id: 's2',
        type: 'text',
        durationInFrames: 120,
        props: { text: 'Body' },
        transitionIn: { type: 'fade', durationInFrames: 12 },
      },
    ],
    assets: [],
    metadata: { createdAt: now, updatedAt: now },
    ...overrides,
  };
}

describe('scene definitions', () => {
  it('every definition has valid default props and an inspector field per prop key', () => {
    for (const def of SCENE_DEFINITION_LIST) {
      const defaults = def.defaultProps();
      expect(def.propsSchema.safeParse(defaults).success, def.type).toBe(true);
      const shape = (def.propsSchema as unknown as { shape: Record<string, unknown> }).shape;
      for (const field of def.inspector) {
        expect(field.key in shape, `${def.type}.${field.key} is not a prop`).toBe(true);
      }
      for (const key of Object.keys(shape)) {
        expect(
          def.inspector.some((f) => f.key === key),
          `${def.type}.${key} has no inspector field`,
        ).toBe(true);
      }
      for (const key of def.assetKeys) {
        expect(
          def.inspector.some((f) => f.key === key),
          `${def.type}.${key} asset field`,
        ).toBe(true);
      }
    }
  });

  it('applies defaults when parsing scene props', () => {
    const def = getSceneDefinition('hook');
    const parsed = def.propsSchema.parse({ text: 'x' }) as Record<string, unknown>;
    expect(parsed.size).toBe('lg');
    expect(parsed.highlightWords).toEqual([]);
  });
});

describe('VideoProjectSchema', () => {
  it('accepts a valid project and applies defaults', () => {
    const result = validateProject(baseProject());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.fontFamily).toBe('Inter');
      expect(result.data.audio.musicVolume).toBe(0.25);
      expect(result.data.scenes[0]?.durationMode).toBe('fixed');
    }
  });

  it('rejects invalid scene props with a scoped path', () => {
    const result = validateProject(
      baseProject({
        scenes: [{ id: 's1', type: 'hook', durationInFrames: 90, props: { text: '' } }],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.path).toBe('scenes.0.props.text');
    }
  });

  it('rejects unknown scene types', () => {
    const result = VideoProjectSchema.safeParse(
      baseProject({
        scenes: [{ id: 's1', type: 'nope' as never, durationInFrames: 90, props: {} }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects durations below the scene minimum', () => {
    const result = validateProject(
      baseProject({
        scenes: [{ id: 's1', type: 'feature', durationInFrames: 10, props: { title: 't' } }],
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.path).toBe('scenes.0.durationInFrames');
  });

  it('rejects dangling asset references', () => {
    const result = validateProject(
      baseProject({
        scenes: [
          {
            id: 's1',
            type: 'intro',
            durationInFrames: 90,
            props: { title: 't' },
            voiceoverAssetId: 'missing',
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
    const musicResult = validateProject(baseProject({ audio: { musicAssetId: 'nope' } }));
    expect(musicResult.success).toBe(false);
  });

  it('rejects duplicate scene ids', () => {
    const result = validateProject(
      baseProject({
        scenes: [
          { id: 'dup', type: 'intro', durationInFrames: 90, props: { title: 't' } },
          { id: 'dup', type: 'intro', durationInFrames: 90, props: { title: 't' } },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects transitions longer than the scene', () => {
    const result = validateProject(
      baseProject({
        scenes: [
          {
            id: 's1',
            type: 'intro',
            durationInFrames: 60,
            props: { title: 't' },
            transitionIn: { type: 'fade', durationInFrames: 60 },
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it('collects scene asset ids', () => {
    const ids = sceneAssetIds({
      id: 's',
      type: 'feature',
      durationInFrames: 90,
      durationMode: 'fixed',
      audioPaddingFrames: 0,
      hidden: false,
      overlays: [],
      props: { title: 't', mediaAssetId: 'a1', backgroundAssetId: 'a2' },
      voiceoverAssetId: 'v1',
    });
    expect(ids).toEqual(['a1', 'a2', 'v1']);
  });
});

describe('migrations', () => {
  it('migrates v1 image scenes from kenBurns to motion', () => {
    const v1 = {
      ...baseProject(),
      schemaVersion: 1,
      scenes: [
        { id: 'i1', type: 'image', durationInFrames: 90, props: { kenBurns: false } },
        { id: 'i2', type: 'image', durationInFrames: 90, props: { kenBurns: true } },
        { id: 't', type: 'text', durationInFrames: 90, props: { text: 'x' } },
      ],
    };
    const result = parseProjectDocument(v1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.data.scenes[0]?.props.motion).toBe('none');
      expect(result.data.scenes[1]?.props.motion).toBe('ken-burns');
      expect('kenBurns' in result.data.scenes[0]!.props).toBe(false);
    }
  });

  it('passes through current documents', () => {
    const doc = baseProject();
    expect(migrateProjectDocument(doc).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('rejects newer documents with a helpful issue', () => {
    const result = parseProjectDocument({ ...baseProject(), schemaVersion: 999 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]?.code).toBe('migration');
  });

  it('rejects documents without a version', () => {
    const { schemaVersion: _v, ...noVersion } = baseProject();
    const result = parseProjectDocument(noVersion);
    expect(result.success).toBe(false);
  });
});

describe('formats', () => {
  it('finds the nearest aspect ratio', () => {
    expect(aspectRatioOf({ width: 720, height: 1280 })).toBe('9:16');
    expect(aspectRatioOf({ width: 1280, height: 720 })).toBe('16:9');
    expect(aspectRatioOf({ width: 1000, height: 1000 })).toBe('1:1');
    expect(aspectRatioOf({ width: 800, height: 1000 })).toBe('4:5');
  });
});
