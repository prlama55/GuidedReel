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

/** CLAUDE.md and project skills so Claude Code knows the rules of a generated app. */
export function thinClaudeFiles(opts: ScaffoldOptions): GeneratedFiles {
  const { displayName, scope, slug, apps } = opts;
  const appsList = [
    apps.web ? '`apps/web` (Next.js)' : null,
    apps.desktop ? '`apps/desktop` (Electron)' : null,
  ]
    .filter(Boolean)
    .join(' and ');
  const docs = `${UPSTREAM.repoUrl}/tree/main/docs`;

  const claudeMd = `# ${displayName}

Video creator app built on \`@guidedreel/core\` (${appsList}). The engine (schemas, timeline, scene
components, Remotion renderer, editor UI) comes from the \`@guidedreel/*\` npm packages; this
repository owns the app shells and the templates in \`packages/extensions\`.

## Rules

- Apps import only \`@guidedreel/core\` (and its subpaths \`/ui\`, \`/render\`, \`/storage\`, \`/providers\`,
  \`/styles.css\`). Never import \`remotion\`, \`@remotion/*\` or another \`@guidedreel/*\` package directly;
  ESLint (\`createConfig({ app: true })\`) rejects it.
- New templates go in \`packages/extensions/src/templates/\` and are added to the \`templates\` array in
  \`packages/extensions/src/index.ts\`. Both shells register them on start-up. Scene *types* cannot be
  added here (they live in the engine's render bundle); compose templates from the built-in types.
- Keep \`pnpm lint\`, \`pnpm typecheck\` and \`pnpm test\` green. \`pnpm test\` validates every template
  in every format it supports.
- Engine upgrades: \`pnpm up "@guidedreel/*"\`, then run the checks.

## Commands

${apps.web ? '- `pnpm dev:web` — Next.js at http://localhost:3000\n' : ''}${apps.desktop ? '- `pnpm dev:desktop` — Electron with hot reload\n' : ''}- \`pnpm build\` · \`pnpm lint\` · \`pnpm typecheck\` · \`pnpm test\` · \`pnpm format\`
${apps.desktop ? `- \`pnpm --filter @${scope}/desktop dist:mac|dist:win|dist:linux\` — installers\n` : ''}
Skills in \`.claude/skills/\` cover template authoring and the app shells. Engine documentation: ${docs}.
`;

  const templatesSkill = `---
name: extend-templates
description: Use when adding or changing a video template in ${displayName} — files under packages/extensions/src/templates, TemplateDefinition, inputSchema/sampleInput/create, buildProject and SceneSpec, the built-in scene types and their props, template categories/formats, registration in packages/extensions/src/index.ts, or a failing templates.test.ts. Triggers — "add a template", "new template", "template not showing", "SceneSpec", "buildProject", "scene props", "which scene types", "template test failed".
---

# Templates (packages/extensions)

Templates are pure data: a \`TemplateDefinition\` turns user input into a project made of the engine's built-in scene types. No React, no Remotion. The example is \`src/templates/launch-promo.ts\`; the test is \`src/templates.test.ts\`.

## Add one

1. Copy \`launch-promo.ts\`, pick a unique \`meta.id\` (prefix with \`${slug}-\`), name, description, \`category\`, \`supportedFormats\`, \`accentColor\`.
2. Define \`inputSchema\` with Zod (what the new-project dialog asks for) and \`sampleInput()\` with real content (the preview plays immediately).
3. Build scenes in \`create(input, ctx)\` as \`SceneSpec[]\` and return \`buildProject(ctx, meta.id, specs, { defaultTransition })\`.
4. Add it to \`templates\` in \`src/index.ts\`. Both shells call \`templateRegistry.registerAll(templates)\`, so it appears in the Templates gallery and the new-project dialog.
5. \`pnpm test\`: every template is instantiated with its sample input in every supported format and validated.

Imports come from \`@guidedreel/core\`: \`buildProject\`, \`SceneSpec\`, \`TemplateDefinition\`, \`TemplateRegistry\`, \`FORMAT_PRESETS\`, \`validateProject\`, \`calculateTimeline\`.

## Reference

- \`category\`: \`promotional\` | \`advertisement\` | \`social\` | \`educational\` | \`news\` | \`event\` | \`other\`.
- \`supportedFormats\`: \`'9:16'\` (Reels, Shorts, TikTok, Stories), \`'16:9'\`, \`'1:1'\`, \`'4:5'\`.
- \`SceneSpec\` = \`{ type, props, title?, durationSeconds?, durationInFrames?, transitionIn?, voiceoverAssetId?, durationMode? }\`. Omit duration to get the scene type's default. \`transitionIn\` = \`{ type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom' | 'wipe', durationInFrames }\` (never on the first scene).
- Props are validated against each scene type's schema; unknown or invalid props fail \`pnpm test\`. The editor's inspector shows every field with its allowed values.

| Scene type | Main props |
| --- | --- |
| \`hook\` | \`text\`, \`highlightWords\` (string[]), \`size\` (sm/md/lg/xl), \`animation\` ('word-by-word' or an enter animation) |
| \`intro\` | \`title\`, \`subtitle\`, \`showLogo\`, \`logoAssetId\` |
| \`text\` | \`text\`, \`align\` (left/center/right), \`size\`, \`animation\` |
| \`image\` | \`imageAssetId\`, \`caption\`, \`motion\`, \`backgroundColor\` |
| \`video\` | \`videoAssetId\`, \`caption\`, \`startFromSeconds\`, \`muted\`, \`volume\`, \`backgroundColor\` |
| \`feature\` | \`badge\`, \`title\`, \`description\`, \`mediaAssetId\`, \`layout\` (e.g. 'media-top') |
| \`product\` | \`name\`, \`tagline\`, \`price\`, \`bullets\` (string[]), \`imageAssetId\` |
| \`quote\` | \`quote\`, \`author\`, \`role\`, \`rating\`, \`avatarAssetId\` |
| \`cta\` | \`headline\`, \`subline\`, \`buttonText\`, \`url\`, \`showLogo\` |
| \`outro\` | \`text\`, \`handles\` (string[]), \`showLogo\` |

Most types also accept \`backgroundAssetId\` / background colour props and \`exitAnimation\`. Asset ids reference uploads the user adds later; templates normally leave them empty.

Engine docs for scenes and templates: ${docs}/scene-system.md and ${docs}/template-system.md.
`;

  const appSkill = `---
name: app-shell
description: Use when working on ${displayName}'s app shells — ${appsList}: how they wire @guidedreel/core (EditorHost, storage, render client, platform adapter), where templates are registered, build and dev commands, upgrading the engine, branding files, Next.js serverExternalPackages, Electron packaging and the "no Remotion in apps" rule. Triggers — "providers.tsx", "App.tsx", "EditorHost", "dev:web", "dev:desktop", "electron-builder", "upgrade core", "pnpm up @guidedreel", "lint says Apps depend on @guidedreel/core only", "branding", "icons".
---

# App shells

Thin shells around \`@guidedreel/core\`. Everything that makes a video lives in the engine packages; the shells inject platform pieces and register templates.

## Where things are
${
  apps.web
    ? `
- **Web** \`apps/web\`: \`src/app/providers.tsx\` builds the \`EditorHost\` (IndexedDB storage, HTTP render client, web platform adapter, \`templateRegistry\`) and registers \`templates\` from \`@${scope}/extensions\`. Server rendering: \`src/server/render-service.ts\` behind \`src/app/api/render/*\` (in-process queue; needs a long-running Node server, not serverless). TTS proxy in \`src/app/api/tts/*\`. \`next.config.ts\` keeps \`@guidedreel/renderer\`, \`@guidedreel/compositions\` and \`@remotion/*\` in \`serverExternalPackages\` and transpiles \`@${scope}/extensions\`. Env: copy \`.env.example\` to \`apps/web/.env.local\`.
`
    : ''
}${
    apps.desktop
      ? `
- **Desktop** \`apps/desktop\`: \`src/main\` (window, menu, IPC, \`app://\` asset protocol, render \`utilityProcess\` in \`render-manager.ts\`/\`render-worker.ts\`, local TTS), \`src/preload\`, \`src/renderer/src/App.tsx\` (builds the \`EditorHost\` and registers templates). \`scripts/build-bundle.ts\` prebuilds the Remotion bundle shipped in \`resources/\`. \`electron-builder.yml\`: app id \`com.${slug}.app\`, product name, installers. electron-builder packs only \`dependencies\`, so anything the main process needs at runtime must be a dependency (\`@guidedreel/core\`, \`react\`, \`react-dom\`, \`zod\`); \`@${scope}/extensions\` stays a devDependency (bundled by Vite). \`e2e/packaged.spec.ts\` boots the packaged app; run \`pnpm --filter @${scope}/desktop exec electron-builder --dir --config electron-builder.yml\` first.
`
      : ''
  }
- **Templates** \`packages/extensions\` (see the \`extend-templates\` skill).

## Rules

- Import only \`@guidedreel/core\` and its subpaths. ESLint rejects \`remotion\`, \`@remotion/*\` and other \`@guidedreel/*\` packages in app code.
- Styling: \`@import "tailwindcss"; @import "@guidedreel/core/styles.css";\` — the engine stylesheet registers its own Tailwind source.
- Brand colours belong to videos (brand kit), never to the app UI.

## Commands

${apps.web ? '- `pnpm dev:web`, `pnpm build:web`, `pnpm test:e2e` (Playwright)\n' : ''}${apps.desktop ? `- \`pnpm dev:desktop\`, \`pnpm build:desktop\`, \`pnpm --filter @${scope}/desktop dist:mac|dist:win|dist:linux\`\n` : ''}- \`pnpm lint\` · \`pnpm typecheck\` · \`pnpm test\` · \`pnpm format\`
- Upgrade the engine: \`pnpm up "@guidedreel/*"\` then the checks above. All \`@guidedreel/*\` packages share one version; keep them equal.

## Branding
${apps.web ? '\n- Web: `apps/web/public/icons/`, `apps/web/src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png`, `twitter-image.png`, metadata in `apps/web/src/app/layout.tsx`.' : ''}${apps.desktop ? '\n- Desktop: `apps/desktop/build/icon.png`, `apps/desktop/electron-builder.yml`, `apps/desktop/src/main/app-info.ts`.' : ''}

Engine documentation: ${docs} (architecture, rendering, desktop, web, user guide).
`;

  return {
    'CLAUDE.md': claudeMd,
    '.claude/skills/extend-templates/SKILL.md': templatesSkill,
    '.claude/skills/app-shell/SKILL.md': appSkill,
  };
}
