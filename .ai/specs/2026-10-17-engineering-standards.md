# Apply the engineering standards

- **Date:** 2026-10-17
- **Status:** Approved 2026-10-17, implementation in progress (see Plan and progress)
- **Source:** `.ai/docs/engineering-standards.md` (the standing document; this spec is how this repo applies it)

## Context

`.ai/docs/engineering-standards.md` defines naming, a reusable API/UI layer, architecture rules, security minimums, code-quality rules and a review checklist. It was written against a different bootstrap, so parts of it don't match this repo:

- **Missing files:** it refers to files that don't exist here: `user.entity.ts`, `mentor-profile.entity.ts`, `user.service.ts`, `/admin/users`, `base.entity.ts`, `define.ts` and `docs/product-scope.md`.
- **Inapplicable migration steps:** steps 1 (move the auth/mentors files), 3 (refactor `/admin/users`) and 8 (reconcile `product-scope.md`) can't be applied as written.
- **Outdated Next.js config:** it prescribes `export const dynamic = "force-dynamic"`. In Next 16 that's the legacy caching model (removed when Cache Components is enabled). This repo uses `await connection()` from `next/server` for request-time rendering, which the bundled docs recommend.
- **Conflicting architecture:** its dependency direction differs from the current one.

## Decisions (user, 2026-10-17)

1. **Dependency direction:** adopt the standards. It's `app → core → db`, with `ui` standalone.
   - The Awilix container and `Cradle` move to `packages/core/src/container/`.
   - `db` and `ui` import no workspace package, and `app` doesn't import `db` directly.
   - Only `db` imports `@mikro-orm/*`.
2. **Scope:** build the shared layers and prove them with unit tests and by refactoring `/api/health` and `/admin`.
   - Shared layers: `core/src/http` (`errors`, `apiHandler`, `makeCrudRoute`), `ui/src/backend` (`apiCall`, `CrudForm`, `DataTable`, `feedback`), a Zod-validated env and a pino logger.
   - Deferred to the first concept that needs them, per the standards' YAGNI rule: `auth.ts` (needs a session/JWT system), `events/`, `validators/`, concept folders, and `base.entity.ts`/`define.ts`.
3. **Tests:** add Vitest. Tests become part of the validation gate.

## Decisions (agent, within the approved scope)

- **Error hierarchy:** `ServiceUnavailableError` (503) is added to the five errors listed in the standards. `/api/health` needs a 503 that goes through the envelope.
- **`/api/health` contract:** now uses the standard envelope.
  - Success: `200 {"ok":true,"data":{"status":"ok","db":"ok"}}`.
  - Failure: `503 {"ok":false,"error":{"code":"service_unavailable","message":"Database unavailable"}}`.
  - Status codes are unchanged, and the response still carries no error details.
- **Explicit route access:** `apiHandler` and `makeCrudRoute` require an `authorize` option, so a route can't forget access control (fail closed). Public routes pass the exported `publicRoute`. `auth.ts` will add session-based authorizers later.
- **CSRF:** `apiHandler` rejects state-changing requests (POST/PUT/PATCH/DELETE) that lack the custom header `x-devmentor-request: 1`. `apiCall` always sends it.
- **shadcn primitives:** they move to `packages/ui/src/components/ui/`, as the standards' structure shows. Only `components.json` aliases change.
- **Route groups:** the public `(frontend)` group becomes `(marketing)`, the standards' persona group for the landing page. `(backend)/admin` stays. The other persona groups (`(auth)`, `(student)`, `(mentor)`) are created when their first page is added.
- **Health check service:** `HealthService` lives in `core/src/services/health/`, and the `select 1` moves into `db` as `pingDatabase(em)`. Health isn't a domain concept, so the "entity/service pairing" checklist item doesn't apply to it.
- **Audit gate:** `npm audit` currently fails on GHSA-vfj7-8cjw-p6xm (`braces`, no patched release; see the monorepo-migration spec). The gate runs a small script, `scripts/audit.mjs`, that fails on any high or critical advisory except allowlisted ones. Each allowlist entry has a reason and a review date.

## Plan and progress

Every phase ends with `npm run lint`, `npm run typecheck`, `npm run build` and, from phase 2 on, `npm test`, all passing from the root.

### Phase 1: Dependency direction and container move

- **db:**
  - Owns database env parsing (`loadDatabaseEnv`, Zod) and the ORM config.
  - Re-exports the MikroORM types other packages need.
  - Adds `pingDatabase(em)`.
  - Imports no workspace package.
- **core:**
  - `config/env.ts` composes the db env with app-level env (Zod).
  - `container/{cradle.ts,container.ts}` holds explicit registrations, `getContainer()` and `withScope()`.
  - `services/health/health.service.ts` (`HealthService`).
  - `logger.ts` (pino, with redaction). It moved here from phase 3 because the new `no-console` rule needs it.
  - Delete `registerCore`, `RegisterFn`, `registerDb` and `packages/app/src/server/`.
- **app:** imports only `@devmentor/core` and `@devmentor/ui`.
- **ESLint:**
  - Boundary rules: core → only `@devmentor/db`; db and ui → no `@devmentor/*`; app → no `@devmentor/db`; `@mikro-orm/*` only in db; nothing imports app.
  - Code-quality rules: `no-explicit-any`, `no-console` and `no-empty` (catch included) as errors.
- **Docs:** `AGENTS.md` and `README.md` dependency direction.

Done when:
- lint, typecheck and build pass.
- `/api/health` returns 200 with the database up and 503 without it.
- `/admin` renders.
- Throwaway files that break each boundary rule fail lint.

### Phase 2: Test framework and validation gate

- Vitest at the root with one project per package: node for core and db, jsdom for ui.
- `server-only` is aliased to an empty module in tests.
- Root scripts: `test`, `audit` (`scripts/audit.mjs` with `audit-allowlist.json`), and `validate` (lint, typecheck, test, build, audit).
- First tests: env validation (core, db).

Done when:
- `npm test` runs every project and passes.
- `npm run audit` passes only because of the documented allowlist entry, and fails if that entry is removed.
- `npm run validate` passes.

### Phase 3: Server-side shared layer (`core/src/http`) and logger

- Logger redaction tests. The logger itself is built in phase 1.
- `http/errors.ts`: `AppError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError` (with `fieldErrors`), `ConflictError` and `ServiceUnavailableError`.
- `http/apiHandler.ts`:
  - The envelope, the AppError → status mapping and ZodError → `ValidationError`.
  - Unknown errors are logged and returned as a generic 500.
  - The CSRF header check and the required `authorize` option.
- `http/makeCrudRoute.ts`:
  - Zod schemas plus a scoped service resolver go in; `{ GET, POST, PUT, DELETE }` comes out.
  - Only parsed schema output reaches the service, so there's no mass assignment.
  - `id` and pagination come from the query string.
- Refactor `/api/health` onto `apiHandler` and `HealthService`.
- Unit tests for all of the above.

Done when:
- Tests cover every error mapping, CSRF, unknown-error redaction, logger redaction, and makeCrudRoute validation and stripping.
- `/api/health` returns the envelope with 200 or 503.

### Phase 4: Client-side shared layer (`ui/src/backend`) and pages

- Move the shadcn primitives to `components/ui/`, updating the aliases in both `components.json` files. Add the primitives the layer needs (`input`, `label`, `table`, `textarea`, `checkbox` as needed) with `shadcn add`.
- `backend/api/apiCall.ts`: `apiCall` and `apiCallOrThrow`, `readJsonSafe`, the CSRF header, and a typed `ApiResult`.
- `backend/feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx`.
- `backend/forms/CrudForm.tsx`:
  - Takes a Zod schema and a field config.
  - Validates on the client and shows server `fieldErrors`.
  - Handles loading, Cmd/Ctrl+Enter to submit and Escape to cancel.
- `backend/tables/DataTable.tsx`: column config, loading/empty/error states, pagination and row actions.
- Pages:
  - Rename `(frontend)` to `(marketing)`, and rename page exports to `<Segment>Page`.
  - `/admin` fetches `/api/health` through `apiCall` and renders with the feedback components.
- Unit tests for every component and for `apiCall`.

Done when:
- Tests pass.
- `/` and `/admin` render, verified with screenshots.
- `/admin` shows "Unavailable" when the database is down.
- There's no direct `fetch` outside `apiCall`; lint enforces this with `no-restricted-globals`/syntax rules.

### Phase 5: Conventions in AGENTS.md and close-out

- `AGENTS.md`:
  - "Domain concept convention" and "Reusable API & UI layer", adapted from section 3 of the standards.
  - A short "Engineering standards" section: the principles, security minimums and code-quality rules as binding rules, the review checklist, and a pointer to `.ai/docs/engineering-standards.md`.
  - `.ai/docs/` in the `.ai/` tree.
  - The validation gate.
- README: the architecture and commands.
- Full verification:
  - Clean `npm ci`, then `npm run validate`.
  - Production and dev startup, `/api/health` (up and down), `/admin` (up and down).
  - Screenshots.
- Move this spec to `implemented/`.

### Progress

| Phase | Status | Notes |
| --- | --- | --- |
| 1 | Done 2026-10-17 | lint, typecheck and build pass. 11 throwaway boundary/code-quality violations all fail lint, and allowed imports pass. Dev: `/`, `/admin` (Operational), `/api/health` 200. Database down: `/admin` "Unavailable", `/api/health` 503, failure logged as pino JSON. The migration CLI still works. |
| 2 | Done 2026-10-17 | Vitest 5 projects for core, db (node) and ui (jsdom); 13 env tests pass. `npm run audit` passes only through the allowlist, and exits 1 when the entry is removed, expired or stale. `npm run validate` exits 0. |
| 3 | Done 2026-10-17 | 52 tests pass. `/api/health` returns the envelope (200 / 503); a bad `DATABASE_URL` gives a generic logged 500; POST gives 405. `/admin`: Operational / Unavailable. Connections stay at 1 across HMR. `npm run validate` exits 0. |
| 4 | Not started | |
| 5 | Not started | |

### Phase 1 notes

- **No silent fallback:** `MikroORM.init` doesn't connect (it only discovers metadata), so a database outage surfaces in `HealthService.isDatabaseAvailable()`, which logs it with pino and returns false. A container build failure means misconfiguration, such as an invalid env. It propagates as a 500 and isn't swallowed.
- **db is self-contained:** db owns its env schema (`loadDatabaseEnv`), so the MikroORM CLI config needs no workspace import. `core`'s `loadConfig()` composes it with `LOG_LEVEL`.
- **Removed:** `registerCore`, `registerDb`, `RegisterFn` and `packages/app/src/server/`. Registration is explicit in `core/src/container/container.ts`.

### Phase 2 notes

- **Vitest layout:**
  - Root `vitest.config.ts` with inline projects; tests are colocated as `src/**/*.test.{ts,tsx}`.
  - `server-only` is aliased to `test/stubs/server-only.ts`.
  - ui uses jsdom, with `@testing-library/jest-dom` matchers and cleanup in `test/setup-dom.ts`.
- **Root config:**
  - The root `package.json` is now `"type": "module"`. Vite 8 warned that the ESM `vitest.config.ts` was otherwise loaded as CommonJS.
  - A root `tsconfig.json` (with `checkJs`) typechecks `vitest.config.ts`, `test/` and `scripts/`, and the root `typecheck` script runs it before the workspaces.
- **Audit gate:**
  - `scripts/audit.mjs` parses `npm audit --json` and fails on high or critical advisories that aren't in `audit-allowlist.json`.
  - It also fails on entries past their `reviewBy` date and on entries npm no longer reports.
  - The only entry is GHSA-vfj7-8cjw-p6xm, to be reviewed by 2027-01-17.

### Phase 3 notes

- **`core/src/http`:**
  - `errors.ts`: the AppError hierarchy, with `ValidationError.fromZod` mapping issue paths to dot-separated `fieldErrors`.
  - `envelope.ts`: `ApiEnvelope` and the CSRF header constants.
  - `apiHandler.ts`: the CSRF check, then `authorize`, then the handler, mapping the result to the envelope. Responses send `Cache-Control: no-store`. It also exports `parseJsonBody`, the only way a route reads a JSON body.
  - `makeCrudRoute.ts`: separate `access.read` and `access.write` authorizers, plus pagination (`page`, and `pageSize` up to 100).
- **Logger:** `getLogger()` is process-wide and also registered in the container. It only needs `LOG_LEVEL`, so configuration errors can still be logged.
- **Bug found and fixed:** the container was cached on `globalThis`, which served stale classes after HMR (dev 500) and mixed class identities across Next's route and page bundles (`/admin` 500 when the database was down). It's now cached per module. See `.ai/lessons/2026-10-17-no-globalthis-container.md`.
- **Test helper:** `captureLogs` lives in `packages/core/src/testing/`. A shared root `test/` helper would break `import/no-relative-packages`, which is correct.

## Out of scope

- Domain concepts and entities (auth, mentors, bookings, …), so `auth.ts`, `events/`, `validators/`, `base.entity.ts` and `define.ts` are deferred.
- Password hashing, JWT, cookies and rate limiting. These are rules for the auth concept, and they're recorded in `AGENTS.md` now so they apply when auth is built.
- `docs/product-scope.md` doesn't exist in this repo, so there's nothing to reconcile. Recorded here.

## Acceptance criteria

- [ ] The dependency direction `app → core → db` with `ui` standalone is enforced by ESLint and documented.
- [ ] The container and `Cradle` are in `packages/core/src/container/`, with every registration explicit.
- [ ] The `core/src/http` and `ui/src/backend` layers exist with passing unit tests.
- [ ] `/api/health` and `/admin` use the shared layers.
- [ ] `npm run validate` (lint, typecheck, test, build, audit) passes after a clean `npm ci`.
- [ ] `AGENTS.md` contains the concept convention, the reusable-layer rules and the binding standards.
