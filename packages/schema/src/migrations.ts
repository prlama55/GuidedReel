import { CURRENT_SCHEMA_VERSION } from './project';

type Migration = {
  from: number;
  to: number;
  migrate: (doc: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * Ordered list of migrations. Each step upgrades exactly one version.
 * Add a new entry when CURRENT_SCHEMA_VERSION is bumped.
 */
const MIGRATIONS: Migration[] = [
  {
    // v2: image scenes replace the `kenBurns` toggle with a `motion` preset.
    from: 1,
    to: 2,
    migrate: (doc) => {
      const scenes = Array.isArray(doc.scenes) ? (doc.scenes as Record<string, unknown>[]) : [];
      return {
        ...doc,
        scenes: scenes.map((scene) => {
          if (scene.type !== 'image' || typeof scene.props !== 'object' || scene.props === null)
            return scene;
          const props = { ...(scene.props as Record<string, unknown>) };
          if ('kenBurns' in props) {
            props.motion = props.kenBurns === false ? 'none' : 'ken-burns';
            delete props.kenBurns;
          }
          return { ...scene, props };
        }),
      };
    },
  },
];

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly fromVersion: number | undefined,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

function readVersion(doc: Record<string, unknown>): number {
  const v = doc.schemaVersion;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) return Math.floor(Number(v));
  // Pre-versioned documents are treated as version 0 (unsupported).
  return 0;
}

/**
 * Upgrades a raw project document to CURRENT_SCHEMA_VERSION. Does not validate;
 * callers run the result through VideoProjectSchema afterwards.
 */
export function migrateProjectDocument(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new MigrationError('Project document must be an object', undefined);
  }
  let doc = { ...(input as Record<string, unknown>) };
  let version = readVersion(doc);

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError(
      `Project was created with a newer app version (schema ${version}); please update the app`,
      version,
    );
  }
  if (version === 0) {
    throw new MigrationError('Project document has no schemaVersion', 0);
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === version);
    if (!step) throw new MigrationError(`No migration from schema version ${version}`, version);
    doc = step.migrate(doc);
    version = step.to;
    doc.schemaVersion = version;
  }
  return doc;
}

export function needsMigration(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false;
  return readVersion(input as Record<string, unknown>) !== CURRENT_SCHEMA_VERSION;
}
