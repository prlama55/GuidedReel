import path from 'node:path';
import { UPSTREAM } from './constants';
import type { ScaffoldOptions } from './options';

/** Files written from scratch for a thin app (not copied from the monorepo). Keys are POSIX paths. */
export type GeneratedFiles = Record<string, string>;

/** Dependency range for the published engine packages (same version as this CLI). */
export function corePackageSpec(opts: ScaffoldOptions): string {
  return `^${opts.coreVersion}`;
}

/**
 * pnpm `overrides` that redirect every `@guidedreel/*` package to a local tarball. Tarball names
 * follow `pnpm pack`: `guidedreel-core-0.1.0.tgz` → `@guidedreel/core`. Transitive dependencies
 * between the packages are overridden too, so the install matches a real npm install.
 */
export function tarballOverrides(tarballDir: string, fileNames: string[]): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const file of fileNames) {
    const m = file.match(new RegExp(`^${UPSTREAM.scope}-([a-z0-9-]+)-\\d+\\.\\d+\\.\\d+.*\\.tgz$`));
    if (m) overrides[`@${UPSTREAM.scope}/${m[1]}`] = `file:${path.resolve(tarballDir, file)}`;
  }
  return overrides;
}

export function appendOverrides(workspaceYaml: string, overrides: Record<string, string>): string {
  const entries = Object.entries(overrides);
  if (entries.length === 0) return workspaceYaml;
  const block = [
    '',
    '# Local engine tarballs (create-guidedreel --core-tarballs). Remove to install from npm.',
    ...entries.map(([name, spec]) => `  '${name}': '${spec}'`),
  ];
  // Reuse an existing overrides section (the monorepo has one for get-stream) or start one.
  if (/^overrides:\s*$/m.test(workspaceYaml)) {
    return workspaceYaml.replace(
      /^overrides:\s*$/m,
      `overrides:${block.join('\n')}`.replace('\n\n', '\n'),
    );
  }
  return `${workspaceYaml.trimEnd()}\n\noverrides:${block.slice(1).join('\n')}\n`;
}

export function thinRootPackageJson(
  opts: ScaffoldOptions,
  upstreamRoot: Record<string, unknown>,
): string {
  const { scope, apps } = opts;
  const scripts: Record<string, string> = {};
  if (apps.web) scripts['dev:web'] = `turbo run dev --filter=@${scope}/web...`;
  if (apps.desktop) scripts['dev:desktop'] = `turbo run dev --filter=@${scope}/desktop...`;
  scripts['build'] = 'turbo run build';
  if (apps.web) scripts['build:web'] = `turbo run build --filter=@${scope}/web...`;
  if (apps.desktop) scripts['build:desktop'] = `turbo run build --filter=@${scope}/desktop...`;
  scripts['lint'] = 'turbo run lint';
  scripts['typecheck'] = 'turbo run typecheck';
  scripts['test'] = 'turbo run test';
  if (apps.web) scripts['test:e2e'] = `turbo run test:e2e --filter=@${scope}/web`;
  scripts['format'] = 'prettier --write "**/*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,css}"';
  scripts['format:check'] = 'prettier --check "**/*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,css}"';
  scripts['clean'] = 'turbo run clean && rm -rf node_modules';

  const pkg: Record<string, unknown> = {
    name: opts.slug,
    version: '0.1.0',
    description: `${opts.displayName}: script-to-video app built on @guidedreel/core.`,
    private: true,
  };
  if (opts.repoUrl) pkg['repository'] = { type: 'git', url: `git+${opts.repoUrl}.git` };
  pkg['author'] = { name: opts.author };
  pkg['packageManager'] = upstreamRoot['packageManager'] ?? 'pnpm@10.17.0';
  pkg['engines'] = upstreamRoot['engines'] ?? { node: '>=22' };
  pkg['type'] = 'module';
  pkg['scripts'] = scripts;
  pkg['devDependencies'] = {
    '@guidedreel/config': corePackageSpec(opts),
    prettier: 'catalog:',
    turbo: 'catalog:',
    typescript: 'catalog:',
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export function thinExtensionsFiles(opts: ScaffoldOptions): GeneratedFiles {
  const dir = 'packages/extensions';
  const pkg = {
    name: `@${opts.scope}/extensions`,
    version: '0.1.0',
    private: true,
    description: `Templates and presets for ${opts.displayName}, registered by the app shells on start-up.`,
    type: 'module',
    sideEffects: false,
    exports: { '.': { types: './src/index.ts', default: './src/index.ts' } },
    scripts: {
      typecheck: 'tsc -p tsconfig.json',
      lint: 'eslint src',
      test: 'vitest run',
      clean: 'rimraf .turbo coverage',
    },
    dependencies: {
      '@guidedreel/core': corePackageSpec(opts),
      zod: 'catalog:',
    },
    devDependencies: {
      '@guidedreel/config': corePackageSpec(opts),
      eslint: 'catalog:',
      rimraf: 'catalog:',
      typescript: 'catalog:',
      vitest: 'catalog:',
    },
  };
  return {
    [`${dir}/package.json`]: `${JSON.stringify(pkg, null, 2)}\n`,
    [`${dir}/tsconfig.json`]: `{
  "extends": "@guidedreel/config/tsconfig/base.json",
  "compilerOptions": { "types": [] },
  "include": ["src"]
}
`,
    [`${dir}/eslint.config.js`]: `import { createConfig } from '@guidedreel/config/eslint';
export default createConfig();
`,
    [`${dir}/vitest.config.ts`]: `import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
`,
    [`${dir}/src/index.ts`]: `import type { TemplateDefinition } from '@guidedreel/core';
import { launchPromoTemplate } from './templates/launch-promo';

/**
 * Templates that ${opts.displayName} adds on top of the built-in ones. Both app shells call
 * \`templateRegistry.registerAll(templates)\` on start-up, so adding an entry here is all it
 * takes for a template to show up in the gallery and the new-project dialog.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const templates: TemplateDefinition<any>[] = [launchPromoTemplate];

export * from './templates/launch-promo';
`,
    [`${dir}/src/templates/launch-promo.ts`]: `import { z } from 'zod';
import { buildProject, type SceneSpec, type TemplateDefinition } from '@guidedreel/core';

/**
 * Example template: a product launch promo built from the engine's built-in scene types
 * (hook → intro → features → cta → outro). Copy this file to start your own template.
 *
 * - \`inputSchema\` is what the new-project dialog asks for and what an importer or AI step
 *   fills in later.
 * - \`sampleInput\` opens the template with real content so the preview plays immediately.
 * - \`create\` turns the input into scenes; \`buildProject\` handles ids, timing defaults and
 *   transitions. Scene props must match the scene type's schema (see the inspector in the editor
 *   for every field a scene type accepts).
 */
export const LaunchPromoInputSchema = z.object({
  productName: z.string().min(1).max(80),
  hook: z.string().min(1).max(200),
  tagline: z.string().max(160).optional(),
  features: z
    .array(z.object({ title: z.string().min(1).max(80), description: z.string().max(240).optional() }))
    .min(1)
    .max(5),
  cta: z.object({ headline: z.string().min(1).max(120), buttonText: z.string().max(40).optional() }),
});
export type LaunchPromoInput = z.infer<typeof LaunchPromoInputSchema>;

export const launchPromoTemplate: TemplateDefinition<LaunchPromoInput> = {
  meta: {
    id: '${opts.slug}-launch-promo',
    name: 'Launch Promo',
    description: 'Announce a product: hook, intro, up to five features and a call to action.',
    category: 'promotional',
    supportedFormats: ['9:16', '16:9', '1:1', '4:5'],
    typicalDurationSeconds: 24,
    tags: ['launch', 'promo', 'product'],
    accentColor: '#0EA5E9',
  },
  inputSchema: LaunchPromoInputSchema,
  sampleInput: () => ({
    productName: '${opts.displayName}',
    hook: 'Your next video, ready before the coffee is.',
    tagline: 'Script in, finished video out.',
    features: [
      { title: 'Write the script', description: 'One block per scene, in any language.' },
      { title: 'Drop in media', description: 'Images, clips, voiceover and music.' },
      { title: 'Export anywhere', description: '9:16, 16:9, 1:1 and 4:5 from one project.' },
    ],
    cta: { headline: 'Try ${opts.displayName} today', buttonText: 'Get started' },
  }),
  create: (input, ctx) => {
    const specs: SceneSpec[] = [
      {
        type: 'hook',
        props: { text: input.hook, highlightWords: [], animation: 'word-by-word' },
      },
      {
        type: 'intro',
        props: { title: input.productName, subtitle: input.tagline ?? '', showLogo: true },
        transitionIn: { type: 'zoom', durationInFrames: 14 },
      },
      ...input.features.map<SceneSpec>((feature, i) => ({
        type: 'feature',
        title: \`Feature \${i + 1}\`,
        props: {
          title: feature.title,
          description: feature.description ?? '',
          layout: 'media-top',
          badge: \`0\${i + 1}\`,
        },
        transitionIn: { type: i % 2 === 0 ? 'slide-left' : 'slide-up', durationInFrames: 12 },
      })),
      {
        type: 'cta',
        props: {
          headline: input.cta.headline,
          buttonText: input.cta.buttonText ?? 'Learn more',
          url: '',
          showLogo: true,
        },
        transitionIn: { type: 'wipe', durationInFrames: 14 },
      },
      {
        type: 'outro',
        props: { text: input.productName, showLogo: true, handles: [] },
      },
    ];
    return buildProject(ctx, '${opts.slug}-launch-promo', specs, {
      defaultTransition: { type: 'fade', durationInFrames: 12 },
    });
  },
};
`,
    [`${dir}/src/templates.test.ts`]: `import { describe, expect, it } from 'vitest';
import {
  FORMAT_PRESETS,
  TemplateRegistry,
  calculateTimeline,
  validateProject,
  type AspectRatio,
} from '@guidedreel/core';
import { templates } from './index';

// The same check the engine runs on its own templates: every template must build a valid
// project from its sample input in every format it claims to support.
describe('${opts.displayName} templates', () => {
  const registry = new TemplateRegistry().registerAll(templates);

  it('have unique ids', () => {
    const ids = templates.map((t) => t.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('produce valid projects for every supported format', () => {
    for (const meta of registry.list()) {
      const template = registry.require(meta.id);
      for (const ratio of meta.supportedFormats as AspectRatio[]) {
        const project = registry.instantiate(meta.id, template.sampleInput(), {
          name: \`\${meta.name} \${ratio}\`,
          format: FORMAT_PRESETS[ratio].format,
          aspectRatio: ratio,
        });
        const result = validateProject(project);
        expect(result.success, \`\${meta.id} \${ratio}: \${JSON.stringify(result.issues)}\`).toBe(true);
        expect(calculateTimeline(project).totalFrames).toBeGreaterThan(0);
      }
    }
  });
});
`,
  };
}

export function thinCiWorkflow(opts: ScaffoldOptions): string {
  const { apps, scope } = opts;
  const lines = [
    'name: CI',
    '',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    '',
    'env:',
    '  TURBO_TELEMETRY_DISABLED: 1',
    '  NEXT_TELEMETRY_DISABLED: 1',
    '',
    'jobs:',
    '  checks:',
    '    name: Lint · Typecheck · Test',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 20',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: pnpm/action-setup@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    '          node-version: 22',
    '          cache: pnpm',
    '      - run: pnpm install --frozen-lockfile',
    '      - run: pnpm format:check',
    '      - run: pnpm lint',
    '      - run: pnpm typecheck',
    '      - run: pnpm test',
  ];
  if (apps.web) {
    lines.push(
      '',
      '  build-web:',
      '    name: Build web',
      '    runs-on: ubuntu-latest',
      '    timeout-minutes: 20',
      '    needs: checks',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: pnpm/action-setup@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 22',
      '          cache: pnpm',
      '      - run: pnpm install --frozen-lockfile',
      '      - run: pnpm build:web',
    );
  }
  if (apps.desktop) {
    lines.push(
      '',
      '  build-desktop:',
      '    name: Build desktop (${{ matrix.os }})',
      '    runs-on: ${{ matrix.os }}',
      '    timeout-minutes: 30',
      '    needs: checks',
      '    strategy:',
      '      fail-fast: false',
      '      matrix:',
      '        os: [macos-latest, windows-latest, ubuntu-latest]',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: pnpm/action-setup@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 22',
      '          cache: pnpm',
      '      - run: pnpm install --frozen-lockfile',
      '      - run: pnpm build:desktop',
      '      # Unpacked app only (no installers, no signing) to prove packaging on every OS.',
      `      - run: pnpm --filter @${scope}/desktop exec electron-builder --dir --config electron-builder.yml`,
      '        env:',
      "          CSC_IDENTITY_AUTO_DISCOVERY: 'false'",
    );
  }
  return `${lines.join('\n')}\n`;
}

export function thirdPartyNotices(licenseText: string): string {
  return `# Third-party notices

The app shells under \`apps/\` started as a copy of the ${UPSTREAM.displayName} web and desktop
applications (${UPSTREAM.repoUrl}), and the project depends on the
\`@guidedreel/*\` packages. Both are released under the MIT License reproduced below. The MIT
License applies to that code only; everything you add is yours to license as you wish.

\`\`\`text
${licenseText.trimEnd()}
\`\`\`
`;
}
