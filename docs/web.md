# Web app

`apps/web` is a Next.js 16 (App Router, Turbopack) shell around `@guidedreel/ui`.

- Routes: `/`, `/projects`, `/templates`, `/assets`, `/renders`, `/settings`, `/editor/[projectId]`. Each page renders `AppRouter` client-side only (the editor needs IndexedDB and the Remotion Player).
- `providers.tsx` builds the `EditorHost`: IndexedDB project repository and asset store, object-URL asset resolver, `HttpRenderClient`, `templateRegistry`, Next router navigation.
- Persistence is **local-first**: projects and assets live in the browser (IndexedDB). No account is needed. Export/import `project.json` to move work between devices.
- Rendering: see rendering.md. `src/server/render-service.ts` is the in-process worker; `src/app/api/render/*` are the routes.

## Security measures in V1

- Server-side validation of the project document and render options; the server never writes to a client-supplied path.
- Upload checks: per-asset size limit (`MAX_ASSET_SIZE_BYTES`), MIME allowlist per asset type, one file per declared `store` asset.
- In-memory rate limiting on `POST /api/render` (10/min per IP). Replace with a shared store behind a load balancer.
- Security headers (`nosniff`, `X-Frame-Options`, referrer policy).

## Not yet implemented (Phase 6)

Supabase persistence, authentication/authorization, project ownership, signed asset URLs and a durable render queue. The interfaces (`ProjectRepository`, `AssetStore`, `StorageProvider`, `RenderClient`) are in place so these are adapters, not rewrites. Suggested tables: `users`, `projects`, `project_versions`, `templates`, `assets`, `brands`, `render_jobs`, `render_outputs`.
