<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor: architecture rules

DevMentor is an npm-workspaces monorepo. These are fixed decisions. Don't introduce alternatives (another ORM, DI library, CSS framework, component kit or package manager) without a spec in `.ai/specs/` approved by the user. See `README.md` for the architecture overview.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Database | PostgreSQL |
| ORM | MikroORM 7 (`@mikro-orm/postgresql`, migrations, connection pooling) |
| Dependency injection | Awilix |
| Frontend (public) pages | Tailwind CSS 4 |
| Backend (admin) pages | shadcn/ui (on Tailwind CSS 4) |
| Validation | Zod 4 (env, shared request schemas) |
| Logging | pino (the shared logger from `@devmentor/core`) |
| Unit tests | Vitest 5 + Testing Library + `@vitest/coverage-v8` (100% thresholds) |
| Integration tests | Vitest + Testcontainers (PostgreSQL 17) + agent-browser (headless Chrome) |
| CI | GitHub Actions (`.github/workflows/ci.yml`), Node 24 (`.nvmrc`) |
| Package manager | npm workspaces (keep `package-lock.json`; don't add pnpm/yarn lockfiles) |
| Runtime | Node.js 24 (`.nvmrc`; agent-browser needs 24 or newer, MikroORM 7 22.17 or newer) |

Use the latest stable versions. Before using a library API, check the installed version's docs/types; don't rely on memory from older majors.

## Commands

Run from the repo root:
- **The gate:** `npm run validate` must pass before a change is done. It runs:
  - `npm run lint`: ESLint, including the package-boundary and code-quality rules.
  - `npm run typecheck`: the root tooling plus every package.
  - `npm run test:coverage`: Vitest unit tests with the **100% coverage gate**. Use `npm test` or `npm run test:watch` while developing.
  - `npm run build`: the production build.
  - `npm run audit`: `npm audit` gated by `audit-allowlist.json`. Every entry needs a reason and a `reviewBy` date.
- **Integration tests:** `npm run test:integration`, run after `npm run build`.
  - It starts an ephemeral PostgreSQL with Testcontainers (needs Docker), runs the migrations and starts the built app. It then tests it over HTTP and in a real browser with agent-browser.
  - Without Docker (e.g. this sandbox), set `INTEGRATION_DATABASE_URL` to an admin connection string. The suite then creates and drops a throwaway database on that server.
  - In the sandbox, agent-browser also needs `AGENT_BROWSER_EXECUTABLE_PATH` and `LD_LIBRARY_PATH` set; see `.ai/lessons/2026-10-17-agent-browser-rendered-text.md`.
- **CI** (`.github/workflows/ci.yml`):
  - Runs on every pull request and on pushes to `main`, with five jobs: lint and typecheck, unit tests with the coverage gate, build, integration, and audit. All must be green before merging.
  - When you add or rename a gate script, update the workflow in the same change.
- **Running app:** for UI or behavior changes, also check it.
  - `npm run dev` starts it; in this sandbox, the pm2 `workspace-preview` process serves it on port 3000.
  - Use `GET /api/health` for the database.
- **Migrations:** `npm run db:migration:create` and `npm run db:migrate`. See `README.md` for the full list.

## Packages

```
packages/
├── app/   @devmentor/app   Next.js application: routes, pages, HTTP wiring only
├── core/  @devmentor/core  Business layer: config, logger, DI container + Cradle, services
├── db/    @devmentor/db    Persistence: database env, MikroORM config, entities, migrations
└── ui/    @devmentor/ui    Presentation: shadcn/ui primitives and reusable React components
```

- **Dependency direction:** `app → core → db`, and `ui` is standalone, importable by `app` only.
  - `app` imports `core` and `ui`, never `db`.
  - `core` imports `db`.
  - `db` and `ui` import no workspace package.
  - Nothing imports `app`.
  - ESLint enforces this (`no-restricted-imports`). Don't loosen it for convenience.
- Import other packages only by package name (`@devmentor/db`) through their `exports`, never by relative path into another package (`../../db/src/...`).
- **Layers don't leak:**
  - Persistence stays in `db`, business rules in `core`, HTTP and rendering in `app`, presentation in `ui`.
  - Only `db` imports `@mikro-orm/*`; the others use the types re-exported by `@devmentor/db`.
  - `core` never imports Next.js or React.
  - A page or route never issues a query; it calls a `core` service.
- Internal packages ship TypeScript source (no build step); Turbopack transpiles workspace packages automatically. Each package has its own `package.json` (`"private": true`) and `tsconfig.json` extending a shared base.
- Add a dependency to the package that uses it (`npm install <pkg> -w @devmentor/<name>`), not to the root. Only shared tooling belongs at the root.
- A new package under `packages/` needs a spec and a README update.

## Domain concept convention

Domain code isn't organized into `modules/`. Each concept (`auth`, `mentors`, `availability`, `bookings`, `payments`, `messages`, `favorites`, `reviews`, …) is a same-named sub-folder repeated across the layers that need it:

- `packages/db/src/entities/<concept>/<name>.entity.ts`, registered in `entities/index.ts`.
- `packages/core/src/services/<concept>/<name>.service.ts`, registered in `container.ts` (`asClass(...).scoped()`) and typed in `cradle.ts`.
- `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`: shared Zod schemas, required as soon as there's create or update input.
- `packages/app/src/app/api/<concept>/route.ts`, and the matching `page.tsx` under the relevant persona route group.
- `packages/ui/src/components/<concept>/` for components tied to that concept's domain shape.

To scaffold a concept, follow section 2 of `.ai/docs/engineering-standards.md`.

- Create a concept folder only when its first file is added; never scaffold empty ones.
- The same applies to `core/src/validators/` and `core/src/events/`: create them with the first concept that needs them.
- This is a directory convention, not a module runtime: there's no per-concept `setup.ts`/`acl.ts` and no auto-discovery.
- Event IDs follow `concept.entity.action` in the past tense (e.g. `bookings.booking.created`). They're emitted after a successful mutation through a typed in-process emitter in `core/src/events`, registered on the `Cradle`. There's no queue or worker.

## Reusable API & UI layer

Every route and every page reuses two shared layers instead of re-implementing fetch, validation, auth or error handling.

**Server: `packages/core/src/http/`**, exported from `@devmentor/core`:
- `errors.ts`: the `AppError` hierarchy (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ServiceUnavailableError`).
  - Services throw these and never build HTTP responses.
  - `message` is client-visible, so it must never contain internal details.
- `apiHandler(options, handler)`: wraps every route handler and runs the CSRF header check, then `authorize`, then the handler.
  - The result becomes the envelope `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`.
  - It logs unexpected errors and returns a generic 500.
  - `authorize` is required: pass `publicRoute` explicitly for public endpoints.
  - Routes never write their own `try/catch` or `Response.json` error handling.
  - Read bodies with `parseJsonBody(request, schema)` only.
- `makeCrudRoute({ access: { read, write }, createSchema, updateSchema, service })`: returns `{ GET, POST, PUT, DELETE }` for plain CRUD resources. Workflow endpoints (booking, reschedule, payment) use `apiHandler` directly.
- `auth.ts` comes with the auth concept: `requireSession`, `requireRole` and ownership assertions, used as `authorize` or as the first call in a handler.

**Client: `packages/ui/src/backend/`**, exported as `@devmentor/ui/backend/{api,forms,tables,feedback}`:
- `api`: `apiCall`/`apiCallOrThrow`, the only sanctioned `fetch()` (ESLint bans `fetch` elsewhere in app and ui).
- `forms`: `CrudForm`, bound to the same Zod schema as the route. Use it for every create/edit form.
- `tables`: `DataTable`, for every list.
- `feedback`: `LoadingMessage`, `ErrorMessage` and `EmptyState`, the only loading, error and empty renderers.

A bespoke form, table or fetch needs a stated reason in the PR. The envelope is a shape convention: `core/src/http/envelope.ts` and `ui/src/backend/api/types.ts` each declare it (ui must not import core), so keep them in sync. A shared package for it would be an Ask First architecture change.

**Where a new reusable component goes:**
1. A shadcn primitive goes in `ui/src/components/ui/`, added only with `npx shadcn@latest add`.
2. A generic, concept-agnostic panel pattern (a new field type, table cell or feedback state) goes in `ui/src/backend/<category>/`.
3. A component tied to one concept's domain shape goes in `ui/src/components/<concept>/`, named after the same concept folder used in `db` and `core`.
4. A component used by exactly one page is colocated next to that `page.tsx`. Promote it once a second page needs it.

## Engineering standards

`.ai/docs/engineering-standards.md` is the full standard: naming table, rationale, review checklist and target structure. The rules below are binding. Where that document doesn't match this repo, this file wins. In particular, use `await connection()` from `next/server` for request-time rendering, not the legacy `export const dynamic = "force-dynamic"`.

**Naming:**
- Concept folders are plural single words (`bookings`).
- Entities use PascalCase singular names in `<name>.entity.ts`. Tables and columns are snake_case, with plural table names. IDs are UUIDs.
- Services are `<Name>Service` in `<name>.service.ts`.
- External integrations are ports, `<Name>Gateway`/`<Name>Port` in `<name>.port.ts`, with adapters in `adapters/`.
- Zod schemas are named `<camelCase>Schema` in `<name>.schema.ts`.
- Errors are named `<Name>Error` and extend `AppError`.
- Cradle keys are camelCase.

**Architecture:**
- External integrations (payments, notifications, video) go through a port interface in `core`, with a mock adapter for the MVP. Vendor SDKs never reach `db` or `core` callers.
- The app must build and boot with no database reachable, so database access happens only at request time.
- Check-then-write on shared state (slot availability, booking status) runs in one DB transaction, backed by a unique constraint.
- State transitions that can be retried (payment confirmation, webhooks) are idempotent.
- Prefer the smaller, more explicit change: composition over inheritance, and YAGNI (no RBAC, multi-tenancy, queue or plugin loader).

**Security minimums.** These are blockers in review unless marked otherwise:
- **Server-side enforcement:**
  - Enforce auth on the server for every non-public route.
  - Authorize the specific record (ownership), not just "is logged in".
  - Fail closed on any error inside a security check.
- **Input handling:**
  - Write endpoints use the parsed Zod output only, never the raw body (no mass assignment).
  - No raw SQL built from user input.
  - Recompute prices on the server (`mentor.rate × duration`) and never persist a client-supplied price.
- **Passwords:** bcrypt with cost ≥ 12, or argon2id (≥ 19 MiB memory, ≥ 2 iterations, parallelism 1) if there's a reason to switch.
- **JWT:**
  - HS256 at minimum, with a secret of ≥ 32 random bytes from the Zod-validated env.
  - Short expiry (e.g. 24h) and no refresh flow in the MVP. That's a documented limitation; don't extend the lifetime to compensate.
- **Cookies:** `httpOnly`, `secure` in production, `sameSite=lax` (`strict` for auth-only routes) and a scoped `path`. Never store the token in `localStorage`.
- **CSRF:** `sameSite` cookies plus the custom header that `apiCall` sends and `apiHandler` checks.
- **Rate limiting:** a per-IP+email attempt counter with cooldown on login, register and password reset. Flag that it needs a stronger backend before production traffic. (major)
- **Auth errors:** use generic messages ("invalid credentials") that never reveal whether an email is registered.
- **Secrets:** never log or return secrets, tokens, passwords or full JWTs. The logger redacts these fields; keep its redaction list in sync with new fields.
- **Dependencies:** `npm run audit` is part of the gate. Don't add a dependency for something 20 lines of local code covers.

**Code quality:**
- No `any`; narrow `unknown` at runtime. This is lint-enforced.
- No empty `catch` and no swallowed errors: handle, log with context through the shared logger, or rethrow. No `console`. Both are lint-enforced.
- Use early returns instead of deep nesting.
- No magic numbers or strings: name the constant and say why the value was chosen.
- Booleans read positively (`isConfirmed`). Avoid bare `true`/`false` arguments at call sites.
- No dead code, commented-out code or debug output.
- Comments explain only a non-obvious *why*.
- Extract a copy-pasted block with branching logic; three similar lines are fine.
- A diff traces entirely to its stated purpose: no drive-by renames or formatting passes.

**Tests (mandatory):**
- **100% unit coverage for every change:**
  - Every new feature, and every change to existing code, must leave unit test coverage at **100% lines, branches, functions and statements**. That covers every file in `packages/*/src` and `scripts/`.
  - Write the tests in the same change as the code. `npm run test:coverage` enforces this locally and the CI `unit` job blocks the PR otherwise.
  - A feature isn't done until it's fully covered.
- **No coverage workarounds:**
  - Never lower the thresholds in `vitest.config.ts`, and never add `/* v8 ignore */`/`istanbul ignore` comments.
  - Never widen the coverage `exclude` list to reach 100%. Changing any of these needs a spec approved by the user.
  - If a branch can't be reached by any test, it's dead code: delete it or restructure it, don't ignore it.
- **Integration tests for user-facing flows:** every new page, API route or user-visible behavior also gets an integration test in `test/integration/`.
  - Use real HTTP for APIs and agent-browser for pages.
  - The tests run against the ephemeral PostgreSQL and the built app.
  - Assert what a user sees (rendered text, roles, URLs), not implementation details.
- **Test-first for changes and fixes:**
  - A behavior change ships with a test that fails on the old code.
  - A bug fix ships a regression test. This is required for security-relevant fixes.
  - Race-sensitive flows (booking, reschedule) get an integration test of the concurrent case.
- **Test layout:** unit tests are colocated as `src/**/*.test.{ts,tsx}`. Test-only helpers live in `src/testing/`, and global stubs in `test/stubs/`. Mock at package boundaries (`vi.mock`), not by adding test-only branches to production code.

Before requesting review, go through the review checklist in section 1 of the standards document.

## Data layer (`@devmentor/db`)

- MikroORM code is server-only. `@devmentor/db` and `@devmentor/core` entry points start with `import "server-only"`, so never import them from Client Components (`"use client"`).
- Define entities with `defineEntity` rather than decorators, so no `reflect-metadata` or decorator metadata is needed under SWC/Turbopack.
- One `MikroORM` instance per process, created lazily and cached on `globalThis` so dev HMR doesn't open new pools. Only such external resources go on `globalThis`; the DI container is cached per module (see `.ai/lessons/2026-10-17-no-globalthis-container.md`).
  - Database settings come from env vars validated with Zod in `packages/db/src/env.ts`: `DATABASE_URL`, `DATABASE_POOL_MIN`/`MAX`, `DATABASE_CONNECT_TIMEOUT_MS`.
  - The MikroORM CLI config reads them directly, and `core`'s `loadConfig()` composes them.
- Every request or job uses its own forked `EntityManager` (`orm.em.fork()`), provided through the request's DI scope. Never use the global `em` directly.
- Schema changes happen only through migrations in `packages/db/src/migrations`, generated with the MikroORM CLI and committed with the entity change. Never edit a migration that has been applied; add a new one. Don't use `schema:update` outside throwaway local databases.
- If Next.js fails to bundle a MikroORM package, add it to `serverExternalPackages` in `packages/app/next.config.ts`.

## Dependency injection (Awilix)

- The container lives in `packages/core/src/container/`:
  - `container.ts` registers every dependency by hand, with no `loadModules` or auto-discovery.
  - `cradle.ts` declares the `Cradle` type.
  - A new dependency is one new explicit line in each.
  - Routes and pages use `withScope(fn)` from `@devmentor/core`.
- Lifetimes: process-wide resources (MikroORM instance, config, loggers) are `SINGLETON`. Anything that holds request state (`EntityManager`, repositories, current user) is `SCOPED`, resolved from `container.createScope()` per request, server action or job.
- Services receive dependencies through their constructor or factory function. Don't resolve from the container inside business logic (no service locator), and don't import singletons directly where they should be injected.
- Resolve the container only on the server (Route Handlers, Server Actions, Server Components, `proxy.ts`).

## UI

- **Frontend (public) pages** use Tailwind CSS utility classes and live in persona route groups: `(marketing)/` (landing, exists now), then `(auth)/`, `(student)/` and `(mentor)/`, each created with its first page. Page files default-export `<Segment>Page`, e.g. `HomePage` or `SessionsPage`.
- **Backend (admin) pages** live in `packages/app/src/app/(backend)/admin/`, are served under `/admin`, and are built from shadcn/ui components.
- Add shadcn/ui components by running `npx shadcn@latest add <component>` from `packages/app`. The CLI writes them to `packages/ui/src/components/ui/`. Import them as `@devmentor/ui/components/ui/<name>`. They're never hand-written. Don't run `shadcn init`: it overwrites the monorepo `components.json`. Never copy shadcn components into `packages/app`. Change generated components only when you're deliberately customizing them.
- One Tailwind CSS 4 setup (CSS-first config) is shared by both areas: `packages/ui/src/styles/globals.css`, imported once by the root layout as `@devmentor/ui/globals.css`. It holds the theme tokens and the `@source` entries for `packages/ui` and `packages/app`. Don't add other global stylesheets.
- Merge class names with `cn` from `@devmentor/ui/lib/utils`.
- Default to Server Components; add `"use client"` only when a component needs state, effects or browser APIs, and keep it as low in the tree as possible.

# Project workflow: the `.ai/` directory

All AI agents (Claude Code, Codex, Cursor, etc.) working in this repo MUST follow this workflow. `.ai/` is the project's metadata and long-term memory.

```
.ai/
├── specs/               # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md   # active specs
│   ├── implemented/         # specs that are fully implemented
│   └── archive/             # superseded / abandoned specs
├── runs/                # Logs of autonomous AI runs: YYYY-MM-DD-slug.md
├── lessons.md           # Index of lessons learned (long-term LLM memory)
├── lessons/             # Detailed lessons: YYYY-MM-DD-slug.md
└── docs/                # Standing reference documents (e.g. engineering-standards.md); not dated
```

`.ai/cezar/` is tooling-managed; do not modify it.

## Naming

All files in `specs/`, `runs/` and `lessons/` are named `YYYY-MM-DD-slug.md`: the creation date (use today's date) plus a lowercase kebab-case slug (e.g. `2026-10-17-user-auth.md`). Never invent other schemes.

## Rules

1. **Start of a task:** read `.ai/lessons.md`. If the task relates to a spec in `.ai/specs/`, read it first.
2. **Spec first (SDD):** for any non-trivial feature or behavior change, a spec must exist in `.ai/specs/`. If none exists, write one (or ask the user) before implementing. Implement what the spec says; if reality forces a deviation, update the spec in the same change.
3. **Spec lifecycle:** when a spec is fully implemented, move it to `.ai/specs/implemented/` (keep its filename). When it is superseded or abandoned, move it to `.ai/specs/archive/`. Use `git mv`.
4. **Runs:** every autonomous run MUST create a log at `.ai/runs/YYYY-MM-DD-slug.md` recording: goal, related spec, actions taken, files changed, verification performed and results, outcome (done/partial/blocked), and follow-ups. Update it as the run progresses and finalize it before finishing.
5. **Lessons:** after fixing a bug, hitting a surprising failure, receiving a correction, or discovering a non-obvious fact about the codebase or tooling, record it: create `.ai/lessons/YYYY-MM-DD-slug.md` and add a one-line entry (newest first) to `.ai/lessons.md`. Update or remove existing lessons that are wrong. Don't record what the code or git history already makes obvious. A user correction is always recorded, in the same session, before moving on; if the same mistake recurs, promote the lesson to a rule in this file.
6. **Never** put secrets, tokens or credentials in specs, runs or lessons.

## Working principles

Adapted from Boris Cherny's Claude Code tips.

- **Plan before building.** For multi-step or multi-file work, plan first (plan mode if available) and refine the plan until the implementation is straightforward; the plan belongs in the spec. If the work goes sideways, stop and re-plan rather than patching forward.
- **Prove it works.** A change is done only when verified: run `npm run validate`, and exercise UI or behavior changes in the running app. Report failures as they are; never claim success without running the checks.
- **Own bug fixes.** Given a bug report, error log or failing check, reproduce it, find the root cause and fix it without step-by-step guidance. If a fix feels hacky, scrap it and implement the clean solution.
- **Use subagents** for broad codebase searches and independent parallel work, to keep the main context focused.
