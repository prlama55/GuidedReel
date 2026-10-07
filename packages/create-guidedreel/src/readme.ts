import type { ScaffoldOptions } from './options';
import { UPSTREAM } from './constants';

/** README for a fork of the monorepo; the upstream README is a landing page with example media. */
export function renderForkReadme(opts: ScaffoldOptions): string {
  const { displayName, scope, apps, repoUrl } = opts;
  const both = apps.web && apps.desktop;
  const appsLine = both
    ? 'a **Next.js web app** and an **Electron desktop app** (macOS, Windows, Linux)'
    : apps.web
      ? 'a **Next.js web app**'
      : 'an **Electron desktop app** (macOS, Windows, Linux)';

  const devLines = [
    apps.web ? 'pnpm dev:web        # Next.js at http://localhost:3000' : null,
    apps.desktop ? 'pnpm dev:desktop    # Electron with hot reload' : null,
  ].filter(Boolean);

  const layout = [
    apps.web ? '├── apps/web/            Next.js shell (routes, API render endpoint)' : null,
    apps.desktop ? '├── apps/desktop/        Electron shell (main, preload, renderer)' : null,
    '└── packages/',
    '    ├── core/            the one package the apps import: schema + engine + templates, /ui, /render, /storage, /providers',
    '    ├── schema/          Zod schemas, scene definitions, format presets, migrations',
    '    ├── engine/          timeline math, project factory, script import, errors, logger',
    '    ├── templates/       template registry and factories',
    '    ├── compositions/    Remotion scenes, transitions, animations (one bundle)',
    '    ├── renderer/        VideoRenderer interface + local Remotion renderer',
    '    ├── providers/       TTS and other external provider adapters',
    '    ├── storage/         project/asset repositories (IndexedDB, memory, filesystem)',
    '    ├── ui/              shared editor React components and store',
    '    └── config/          shared tsconfig and eslint presets',
  ].filter(Boolean);

  const desktopInstallers = apps.desktop
    ? `
## Desktop installers

\`\`\`bash
pnpm build:desktop
pnpm --filter @${scope}/desktop dist:mac      # .dmg
pnpm --filter @${scope}/desktop dist:win      # .exe
pnpm --filter @${scope}/desktop dist:linux    # .AppImage + .deb
\`\`\`
`
    : '';

  const branding = [
    '- `packages/ui/src/primitives/BrandMark.tsx` — the logo mark shown in the sidebar.',
    apps.web
      ? '- `apps/web/public/icons/`, `apps/web/src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png`, `twitter-image.png` — web icons and social images.'
      : null,
    apps.web
      ? '- `apps/web/src/app/layout.tsx` — site metadata (title, description, keywords).'
      : null,
    apps.desktop
      ? '- `apps/desktop/build/icon.png` — desktop app icon used by electron-builder.'
      : null,
    apps.desktop
      ? '- `apps/desktop/electron-builder.yml` — app id, product name, publish target.'
      : null,
  ].filter(Boolean);

  const repoLine = repoUrl ? `\nRepository: ${repoUrl}\n` : '';

  return `# ${displayName}

Script-to-video creator built on [Remotion](https://remotion.dev): ${appsLine} sharing one video engine. Write a script, pick a format and a template, add images, clips, voiceover and music, adjust timing, export an MP4.
${repoLine}
Scaffolded with [create-guidedreel](${UPSTREAM.repoUrl}/tree/main/packages/create-guidedreel) from [${UPSTREAM.displayName}](${UPSTREAM.repoUrl}).

## Quick start

Requirements: Node 22+, pnpm 10 (\`corepack enable\`).

\`\`\`bash
pnpm install
${devLines.join('\n')}
\`\`\`

The first render downloads Remotion's headless browser (about 150 MB) once.

## Layout

\`\`\`text
${opts.slug}/
${layout.join('\n')}
\`\`\`

Packages are compiled to \`dist/\` with tsup and the apps depend only on \`@${scope}/core\`; every third-party version is pinned once in \`pnpm-workspace.yaml\` (\`catalog:\`). All \`@remotion/*\` packages must share one version.

## Scripts

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| \`pnpm lint\`            | ESLint across all packages                     |
| \`pnpm typecheck\`       | TypeScript across all packages                 |
| \`pnpm test\`            | Vitest unit tests                              |
| \`pnpm build\`           | Build every package and app                    |
| \`pnpm format\`          | Prettier                                       |
${desktopInstallers}
## Make it yours

${branding.join('\n')}

Everything else (package scope \`@${scope}/*\`, product name, author) was already renamed by the scaffolder.

## Documentation

See [docs/](docs/): architecture, video engine, scene system, template system, project schema, rendering, web, desktop, deployment and a user guide.

## License

Based on ${UPSTREAM.displayName} by ${UPSTREAM.author}, released under the MIT License. See [LICENSE](LICENSE) for the notice and third-party attributions.
`;
}

/** README for a thin app on @guidedreel/core. */
export function renderThinReadme(opts: ScaffoldOptions): string {
  const { displayName, scope, slug, apps, repoUrl } = opts;
  const devLines = [
    apps.web ? 'pnpm dev:web        # Next.js at http://localhost:3000' : null,
    apps.desktop ? 'pnpm dev:desktop    # Electron with hot reload' : null,
  ].filter(Boolean);
  const layout = [
    apps.web ? '├── apps/web/              Next.js shell (routes, server render queue)' : null,
    apps.desktop
      ? '├── apps/desktop/          Electron shell (main, preload, renderer, installers)'
      : null,
    '└── packages/extensions/   your templates and presets (@' + scope + '/extensions)',
  ].filter(Boolean);
  const desktopInstallers = apps.desktop
    ? `
## Desktop installers

\`\`\`bash
pnpm build:desktop
pnpm --filter @${scope}/desktop dist:mac      # .dmg
pnpm --filter @${scope}/desktop dist:win      # .exe
pnpm --filter @${scope}/desktop dist:linux    # .AppImage + .deb
\`\`\`
`
    : '';
  const branding = [
    apps.web
      ? '- `apps/web/public/icons/`, `apps/web/src/app/icon.svg`, `apple-icon.png`, `opengraph-image.png`, `twitter-image.png` and the metadata in `apps/web/src/app/layout.tsx`.'
      : null,
    apps.desktop
      ? '- `apps/desktop/build/icon.png` and `apps/desktop/electron-builder.yml` (app id, product name, publish target).'
      : null,
  ].filter(Boolean);
  const repoLine = repoUrl ? `\nRepository: ${repoUrl}\n` : '';

  return `# ${displayName}

Script-to-video app built on [@guidedreel/core](https://www.npmjs.com/package/@guidedreel/core): write a script, pick a template, add media, export an MP4. The engine (schemas, timeline, scenes, Remotion renderer, editor UI) comes from the \`@guidedreel/*\` packages; this repository holds the app shells and your own templates.
${repoLine}
## Quick start

Requirements: Node 22+, pnpm 10 (\`corepack enable\`).

\`\`\`bash
pnpm install
${devLines.join('\n')}
\`\`\`

The first video render downloads Remotion's headless browser (about 150 MB) once.

## Layout

\`\`\`text
${slug}/
${layout.join('\n')}
\`\`\`

## Add a template

1. Copy \`packages/extensions/src/templates/launch-promo.ts\` and give the template a new \`meta.id\`.
2. Describe the input with Zod (\`inputSchema\`), give it \`sampleInput\`, and build scenes in \`create\` from the built-in scene types (hook, intro, text, image, video, feature, product, quote, cta, outro). The editor's inspector shows every prop a scene type accepts.
3. Add it to the \`templates\` array in \`packages/extensions/src/index.ts\`.

Both app shells call \`templateRegistry.registerAll(templates)\` on start-up, so the template appears in the gallery and the new-project dialog right away. \`pnpm test\` instantiates every template in every format it supports and validates the result.

## Scripts

| Command            | What it does                              |
| ------------------ | ----------------------------------------- |
| \`pnpm lint\`        | ESLint across the workspace               |
| \`pnpm typecheck\`   | TypeScript across the workspace           |
| \`pnpm test\`        | Vitest (template validation and more)     |
| \`pnpm build\`       | Build every app                           |
| \`pnpm format\`      | Prettier                                  |
${desktopInstallers}
## Make it yours

${branding.join('\n')}

Package scope, product name and author were already set by the scaffolder. Upgrade the engine with \`pnpm up "@guidedreel/*"\`.

## Documentation

Engine docs, scene reference and user guide: ${UPSTREAM.repoUrl}/tree/main/docs

## License

The \`@guidedreel/*\` packages and the original app shells are MIT licensed (see THIRD_PARTY_NOTICES.md). Everything you add is yours.
`;
}
