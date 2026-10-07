# Contributing

1. Create a branch from `main`.
2. `pnpm install`, then `pnpm lint && pnpm typecheck && pnpm test` before pushing. `pnpm format` fixes formatting.
3. Keep the dependency direction: `apps → ui → compositions/templates/storage → engine → schema`. Core packages never import Next.js, Electron, Supabase or browser APIs.
4. New stored fields require a schema version bump and a migration (project-schema.md).
5. New scene types and templates follow development.md; the tests enforce inspector coverage and template validity.
6. Prefer small pure functions in `engine` over logic in components. UI components compose store actions; they do not contain business rules.
7. Write structured errors (`VideoCreatorError`) and use the shared logger.
8. Document architectural decisions in `docs/architecture.md` (date them).

Commit messages: imperative mood, scoped when helpful (`engine: derive transition overlap in timeline`).
