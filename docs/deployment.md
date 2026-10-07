# Deployment

## Web

Build: `pnpm build:web`. Start: `pnpm --filter @guidedreel/web start`.

The web app needs a **long-running Node server** for `/api/render` (the in-process render worker). Suitable targets: a VM, Docker on Fly.io / Railway / Render, or Kubernetes. The Next.js pages themselves are static/SSR and portable.

The `/api/tts` routes forward the browser's API key to the chosen provider per request and never store it; they are rate limited per IP. Environment variables (see `.env.example`): `NEXT_PUBLIC_APP_URL`, `RENDER_WORK_DIR`, `RENDER_CONCURRENCY`, `MAX_ASSET_SIZE_BYTES`, `LOG_LEVEL`, and the Supabase keys once Phase 6 lands. Never commit real values.

Docker sketch:

```Dockerfile
FROM node:22-bookworm
RUN apt-get update && apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 libxshmfence1 fonts-noto-color-emoji fonts-noto && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:web
ENV RENDER_WORK_DIR=/data/render
EXPOSE 3000
CMD ["pnpm", "--filter", "@guidedreel/web", "start"]
```

Mount `/data` for render outputs. `fonts-noto-color-emoji` is needed so emoji typed into scene text render in colour on Linux; animated stickers are fetched from fonts.gstatic.com at render time, so the render host needs outbound HTTPS. For horizontal scaling move rendering to a worker (rendering.md).

## Desktop

`.github/workflows/release.yml` builds installers on macOS, Windows and Linux runners when a `v*` tag is pushed and attaches them to a draft GitHub release. Signing/notarization secrets are optional; without them the builds are unsigned (fine for internal testing, not for distribution).

Required secrets for signed builds: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`.

## CI

`.github/workflows/ci.yml`: format, lint, typecheck, unit tests; web build; Remotion render integration test; desktop packaging check (`electron-builder --dir`) on all three OSes.
