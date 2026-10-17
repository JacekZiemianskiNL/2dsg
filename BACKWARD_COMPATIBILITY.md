# Backward compatibility

The surfaces DevMentor treats as contracts, and how a change to one must be handled. Review skills check diffs against this file, and implementation skills warn when a change doesn't comply with it.

DevMentor is a pre-1.0 application with no published packages and no external API consumers yet. Most of its contracts are internal: between workspace packages, between the server and the browser, and between the code and a deployed database. A breaking change is therefore allowed, but it must be **deliberate, complete within one PR, and stated**. It's never accidental.

## How to make a breaking change

1. Name it in the PR body under a `💥 Breaking` heading, saying what breaks and who is affected.
2. Update every consumer in the same PR. The monorepo makes this possible, so a half-migrated state never merges.
3. Follow the surface-specific path below.
4. Label the PR `risk-high` when it touches the database schema or a cross-package contract (see `SDLC.md`).

## Protected surfaces

### 1. Database schema and migrations (`packages/db/src/migrations`)

This is the strictest surface, because a deployed database outlives the code.

- **Breaking:** editing, renaming or deleting a migration that has been applied (merged to `main`). Dropping or renaming a table or column, narrowing a type, or adding `NOT NULL` without a default or backfill.
- **Required path:** never edit an applied migration; add a new one. Split destructive changes into expand → migrate data → contract, across separate PRs, so the running app keeps working during deploy. The PR body carries a rollback plan, and the migration is tested up and down.
- **Fixed conventions:** snake_case, plural table names, UUID primary keys. Changing a convention for existing tables is a breaking change.

### 2. HTTP API envelope (`core/src/http/envelope.ts` ↔ `ui/src/backend/api/types.ts`)

- **Contract:** every route returns `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`. The error `code` values (`validation_failed`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `service_unavailable`) map to statuses 400/401/403/404/409/503, and an unexpected error is a generic 500.
- **Breaking:** changing the envelope shape, renaming or removing an error code, or changing a code's HTTP status.
- **Required path:** change both declarations identically in the same PR (ui must not import core). Update `apiCall`, `CrudForm` and every caller, and add or adjust integration tests that assert the new shape.

### 3. CSRF header (`x-devmentor-request: 1`)

- **Contract:** `apiCall` sends it and `apiHandler` requires it on state-changing requests. The constant is declared in both `core` and `ui`.
- **Breaking:** renaming the header or changing its value on only one side, which makes every write fail. Removing the check is a security regression, not a compatibility question.
- **Required path:** change both constants in the same PR and cover it with an integration test.

### 4. HTTP routes (`packages/app/src/app/api/**`)

- **Current routes:** `GET /api/health` is public. It returns 200 `{ ok: true, data: { status, db } }`, or 503 `service_unavailable` with no internal details. Deployment and uptime probes may depend on it.
- **Breaking:** removing or renaming a route or method, removing or renaming a response field, making an optional request field required, tightening validation on existing input, or changing `authorize` from public to protected (or the other way round, which is a security review item).
- **Required path:** treat additive changes (new optional fields, new routes) as non-breaking. For anything else, update every in-repo caller and the integration tests in the same PR, and call out external consumers once any exist. `/api/health` keeps its status-code semantics.

### 5. Page URLs (`packages/app/src/app/**/page.tsx`)

- **Current pages:** `/` (marketing) and `/admin`.
- **Breaking:** removing or moving a user-facing URL that may be bookmarked or linked.
- **Required path:** add a redirect from the old path, or state in the PR that the page was never released.

### 6. Workspace package exports

- **Contract:** each package's `exports` map: `@devmentor/core` (`.`), `@devmentor/db` (`.`), and `@devmentor/ui` (`./globals.css`, `./components/*`, `./backend/*`, `./lib/*`, `./hooks/*`). The public API includes everything re-exported from `core/src/index.ts`, `core/src/http/index.ts` and `db/src/index.ts`: `withScope`, `getContainer`, `loadConfig`, the logger, `apiHandler`, `makeCrudRoute`, `parseJsonBody`, `publicRoute`, the `AppError` hierarchy, `getOrm`/`closeOrm`, `pingDatabase` and the re-exported MikroORM types.
- **Breaking:** removing or renaming an export or an `exports` subpath, or changing a signature incompatibly.
- **Required path:** these packages have no external consumers, so update every importer in the same PR. The typecheck and lint gates prove completeness. No deprecation window is needed.

### 7. DI Cradle keys (`core/src/container/cradle.ts`)

- **Breaking:** renaming or removing a key, or changing a registration's lifetime (for example scoped to singleton, which leaks request state).
- **Required path:** update `container.ts`, `cradle.ts` and every `withScope` consumer together. A lifetime change needs a stated reason in the PR.

### 8. Environment variables (`.env.example`, `db/src/env.ts`, `core/src/config/env.ts`)

- **Contract:** `DATABASE_URL` (required, `postgres://` or `postgresql://`), `DATABASE_POOL_MIN` (2), `DATABASE_POOL_MAX` (10), `DATABASE_CONNECT_TIMEOUT_MS` (5000) and `LOG_LEVEL` (`info`). An unset or empty value falls back to the default.
- **Breaking:** renaming or removing a variable, adding a new **required** variable, or changing a default in a way that changes behavior.
- **Required path:** update `.env.example`, the README, CI and the integration test setup in the same PR. A new variable is optional with a safe default unless a spec says otherwise, and a rename keeps reading the old name for one release while logging a warning.

### 9. Events (`core/src/events/`, when introduced)

- **Contract:** event IDs `concept.entity.action` and their payload shapes.
- **Breaking:** renaming an event ID or removing or retyping a payload field.
- **Required path:** emit under a new ID and migrate listeners in the same PR. Payload changes are additive only.

### 10. Developer and CI interface

- **Contract:** the root npm scripts (`validate`, `lint`, `typecheck`, `test`, `test:coverage`, `test:integration`, `build`, `audit`, `db:migrate`, `db:migration:create`), the CI job names that `main` requires as checks, `.ai/agentic.config.json` and the `audit-allowlist.json` format.
- **Breaking:** renaming or removing a script, or renaming a required CI job.
- **Required path:** update `.github/workflows/ci.yml`, `AGENTS.md`, `SDLC.md` and the pipeline config's `validation.commands` together. A renamed CI job must also be swapped in `main`'s branch-protection required checks.

## Not protected

Anything not exported through a package's `exports` (for example files under `src/testing/` or internal helpers), test files, `.ai/` run logs and lessons, and generated shadcn primitives (which are re-generated with the CLI).
