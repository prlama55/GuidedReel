# @guidedreel/core

Everything needed to build a script-to-video app on the [GuidedReel](https://github.com/prlama55/GuidedReel) engine, in one dependency. Remotion, the scene components and the renderer come along; your app never lists them.

```bash
pnpm add @guidedreel/core react react-dom
```

| Import                        | Contents                                                   | Runs in                          |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `@guidedreel/core`            | project schema + validation, timeline engine, templates    | anywhere                         |
| `@guidedreel/core/ui`         | React editor, pages, store, Remotion preview               | browser, Electron renderer       |
| `@guidedreel/core/render`     | `LocalRemotionRenderer`, bundle and asset-server helpers   | Node (API routes, Electron main) |
| `@guidedreel/core/storage`    | project/asset repositories (IndexedDB, memory, filesystem) | per implementation               |
| `@guidedreel/core/providers`  | cloud text-to-speech adapters                              | Node or browser                  |
| `@guidedreel/core/styles.css` | editor design tokens; registers a Tailwind `@source`       | app stylesheet                   |

Server bundlers must treat `@guidedreel/renderer`, `@guidedreel/compositions` and `@remotion/*` as external (Next.js: `serverExternalPackages`), because the renderer resolves the Remotion bundle entry on disk and spawns native binaries.

The individual packages (`@guidedreel/schema`, `engine`, `templates`, `compositions`, `renderer`, `storage`, `providers`, `ui`) are published too and share one version with this package.
