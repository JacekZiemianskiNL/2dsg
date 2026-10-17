# Monorepo migration, phase 2: runtime wiring (database + DI)

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-monorepo-migration.md` (phase 2)

## Goal

Prove the database and DI wiring at runtime:
- `/api/health` goes through a request scope.
- The migration CLI works against the local PostgreSQL.
- The connection count is stable across HMR reloads.

## Actions taken

- Checked the progress table: phase 1 done, phase 2 not started. Committed phase 1 as `bb6960e`, which the user allowed.
- Read the bundled Next 16 docs:
  - `route.md`: GET handlers have been dynamic by default since 15.
  - `connection.md`.
- Read the MikroORM 7 sources: `em.execute` exists, and `driverOptions` is merged into the `pg` Pool options.
- Added `packages/app/src/app/api/health/route.ts`.
- Added `databaseConnectTimeoutMs` (`DATABASE_CONNECT_TIMEOUT_MS`, default 5000) to the core config and passed it as `driverOptions.connectionTimeoutMillis`. Documented it in `.env.example`.
- Set `migrations.snapshotName` to `.snapshot-devmentor`.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` / `typecheck` / `build` | PASS (`/api/health` is dynamic, `ƒ`) |
| Dev `GET /api/health` (database up) | 200 `{"status":"ok","db":"ok"}`, `Cache-Control: no-store`; first call 0.98s (ORM init), then under 20ms |
| Production `next start` (database up) | 200, and `/` 200 |
| Production, database refused (port 5999) | 503 `{"status":"error","db":"error"}` in 0.27s; the error is logged server-side only; `/` still 200 |
| Production, database unreachable (10.255.255.1, 2000ms timeout) | 503 after 2.26s |
| `db:migration:create` (no entities) | "No changes required" |
| `db:migration:create -- --blank`, `db:migrate`, `migration:list`, `migration:down` | All work; the probe migration was reverted and deleted |
| Connections across 5 HMR reloads plus health calls | Stable at 1 |

## Outcome

Phase 2 done.

## Follow-ups

- Phase 3: Tailwind 4 and shadcn in `packages/ui`, the `(frontend)` placeholder replacing the starter, and `/admin`.
- Phase 4: docs close-out and full-project verification.

## Lessons added

- `2026-10-17-pkill-f-kills-own-shell`
