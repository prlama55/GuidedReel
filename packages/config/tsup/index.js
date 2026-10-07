/**
 * Shared tsup preset for publishable packages: ESM only, bundled per entry with shared
 * chunks, declaration files, source maps. `dependencies` and `peerDependencies` stay
 * external (tsup default), so React and Remotion are never inlined.
 * @param {import('tsup').Options} [overrides]
 * @returns {import('tsup').Options}
 */
export function libraryConfig(overrides = {}) {
  return {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    // The shared tsconfig enables `incremental` for editor speed; declaration bundling cannot use it.
    dts: { compilerOptions: { incremental: false, composite: false, tsBuildInfoFile: undefined } },
    sourcemap: true,
    splitting: true,
    treeshake: true,
    clean: true,
    outDir: 'dist',
    ...overrides,
  };
}
