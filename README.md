# DevMentor

DevMentor is a Next.js + TypeScript + React application backed by PostgreSQL. It is organized as an npm-workspaces monorepo.

> **Status:** the monorepo migration is complete ([spec](.ai/specs/implemented/2026-10-17-monorepo-migration.md)). There are no domain features yet.

## Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | [Next.js 16](https://nextjs.org/docs) (App Router, Turbopack) | Version-matched docs ship in `node_modules/next/dist/docs/` |
| UI library | React 19 | Server Components by default |
| Language | TypeScript (strict) | |
| Database | PostgreSQL | |
| ORM | [MikroORM 7](https://mikro-orm.io) | Data Mapper, Unit of Work, migrations, connection pooling |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix) | One composition root in `core`, per-request scopes |
| Validation | [Zod 4](https://zod.dev) | Env and (later) shared request schemas |
| Logging | [pino](https://getpino.io) | Shared logger with secret redaction |
| Unit tests | [Vitest 5](https://vitest.dev) + Testing Library | One project per package; 100% coverage gate |
| Integration tests | [Testcontainers](https://testcontainers.com) + [agent-browser](https://github.com/vercel-labs/agent-browser) | Ephemeral PostgreSQL, built app, headless Chrome |
| Frontend styling | [Tailwind CSS 4](https://tailwindcss.com) | Public-facing pages |
| Backend UI | [shadcn/ui](https://ui.shadcn.com) | Admin/back-office pages, built on Tailwind |
| Package manager | npm workspaces | Node.js >= 22.17 |

## Monorepo layout

```
.
├── packages/
│   ├── app/    @devmentor/app   Next.js app: routes, pages, server actions, DI composition root
│   ├── core/   @devmentor/core  Reusable, framework-agnostic logic: domain types, services, utilities, DI helpers
│   ├── db/     @devmentor/db    Data management: MikroORM config, entities, repositories, migrations, seeders
│   └── ui/     @devmentor/ui    Reusable React components: shadcn/ui components and Tailwind primitives
├── .ai/                         AI agent metadata: specs, run logs, lessons (see AGENTS.md)
├── AGENTS.md                    Rules for coding agents
└── package.json                 Workspace root (shared tooling only)
```

### Package dependencies

```
app ──► core ──► db
 └────► ui
```

- `app` (HTTP and rendering) depends on `core` and `ui`, never directly on `db`.
- `core` (business rules: config, logger, DI container, services) depends on `db`. It stays free of Next.js and React.
- `db` (persistence) and `ui` (presentation) depend on no other workspace package. Only `db` imports MikroORM; it re-exports the types the others need.
- ESLint enforces these boundaries.
- Packages import each other by name (`@devmentor/db`) through their `exports`. Internal packages ship TypeScript source, and Turbopack transpiles them, so they have no separate build step.

## Architecture

### Request flow

```
HTTP request / Server Action / job
        │
        ▼
packages/app route/page ── withScope() ──► scoped: EntityManager (orm.em.fork()), services
        │                                 singleton: MikroORM instance (connection pool), config, logger
        ▼
@devmentor/core services ──► @devmentor/db (entities, queries) ──► PostgreSQL
```

### Dependency injection (Awilix)

- The container is built once, in `packages/core/src/container/container.ts`. Every dependency is registered there by hand, and `cradle.ts` declares the `Cradle` type.
- Lifetimes:
  - **Singleton:** process-wide resources (MikroORM instance, configuration, logger).
  - **Scoped:** per request, server action or job (forked `EntityManager`, repositories, request context).
- Services get their dependencies through constructor or factory injection. They never call the container themselves.

### Data layer (MikroORM + PostgreSQL)

- All database code lives in `@devmentor/db` and runs only on the server.
- Entities are defined with `defineEntity`, so no decorators or `reflect-metadata` are needed.
- There is one MikroORM instance per process. It owns the connection pool and is cached on `globalThis` so dev hot reloads don't leak pools.
- Each request works in its own forked `EntityManager`, which keeps the identity map and unit of work isolated.
- Schema changes go through committed migrations in `packages/db/src/migrations`. Applied migrations are never edited.
- Configuration comes from environment variables, validated with Zod (see `.env.example`). `DATABASE_URL` is the PostgreSQL connection string, and `LOG_LEVEL` sets the pino level. `.env*` files are git-ignored.

### Shared API & UI layer

Engineering rules are in [`.ai/docs/engineering-standards.md`](.ai/docs/engineering-standards.md), summarized in `AGENTS.md`.

- **Server:** `@devmentor/core` provides the `AppError` hierarchy, `apiHandler` and `makeCrudRoute`.
  - `apiHandler` checks the CSRF header, runs the required `authorize` check, maps errors to the JSON envelope `{ ok, data | error }`, and logs unexpected failures.
  - `makeCrudRoute` builds config-driven CRUD routes.
- **Client:** `@devmentor/ui/backend/*` provides:
  - `apiCall`, the only sanctioned `fetch`.
  - `CrudForm`, a schema-driven form.
  - `DataTable`.
  - The loading, error and empty feedback components.
- **Domain code:** organized in same-named concept folders (`entities/<concept>`, `services/<concept>`, `api/<concept>`, …) inside the existing packages, created only when a concept's first file is added.

### UI

| Area | Route group | Styling |
| --- | --- | --- |
| Frontend (public pages) | `packages/app/src/app/(marketing)/`, later `(auth)/`, `(student)/` and `(mentor)/` | Tailwind CSS utilities |
| Backend (admin pages, `/admin`) | `packages/app/src/app/(backend)/admin/` | shadcn/ui components from `@devmentor/ui` |

- shadcn/ui primitives (style `base-nova`, built on Base UI) live in `packages/ui/src/components/ui/`. Add more by running `npx shadcn@latest add <component>` from `packages/app`.
- Both areas share one Tailwind CSS 4 stylesheet, `@devmentor/ui/globals.css`, which holds the theme tokens and the `@source` entries for `packages/ui` and `packages/app`.

## Getting started

Requirements: Node.js 24 (see `.nvmrc`; agent-browser needs 24 or newer, MikroORM 22.17 or newer), a running PostgreSQL server, and Docker for the integration tests.

### Quick start: `npm run setup`

From the repo root, run:

```bash
npm run setup
```

It does the manual steps below in one go:

1. Checks the Node.js version against `.nvmrc`.
2. Runs `npm install`.
3. Creates a git-ignored root `.env` (file mode `0600`) from `.env.example`. Its `DATABASE_URL` is the one exported in your shell, or the example's URL with a generated password.
4. Creates the PostgreSQL role and database named in `DATABASE_URL`.
5. Applies the migrations.

Then start the app with `npm run dev` and open the URLs from step 4 below.

- **Rerunning is safe.** Steps that are already done are reported as skipped. An existing `.env` is never overwritten, and an existing role's password is never changed.
- **Admin access:** creating the role and database needs a PostgreSQL superuser. By default, setup connects to the `postgres` database on the `DATABASE_URL` host as `PGUSER` (or your OS user) with `PGPASSWORD`. Otherwise, set `SETUP_ADMIN_DATABASE_URL`, e.g. `postgresql://postgres:<password>@localhost:5432/postgres`, or a socket such as `postgresql:///postgres?host=/var/run/postgresql`. It isn't needed once the database exists.
- **Where settings come from:** `npm run dev`, `npm run db:migrate` and `npm run db:migration:create` load the root `.env`. A variable exported in your shell takes precedence over `.env`, and both take precedence over `packages/app/.env*`. `npm start`, `npm run build` and the tests don't read the root `.env`.

### Manual setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create a database and point `DATABASE_URL` at it, either exported in your shell or in a root `.env` (start from `.env.example`). For example, on a local PostgreSQL:

   ```bash
   createuser --pwprompt devmentor
   createdb --owner devmentor devmentor
   export DATABASE_URL=postgresql://devmentor:<password>@localhost:5432/devmentor
   ```

3. Apply migrations and start the app:

   ```bash
   npm run db:migrate
   npm run dev       # http://localhost:3000
   ```

4. Open `/` (public site), `/admin` (back office) and `/api/health` (health check: 200 `{"status":"ok","db":"ok"}` or 503).

### Commands

Run these from the repo root:

| Command | What it does |
| --- | --- |
| `npm run setup` | Idempotent local setup: install, `.env`, PostgreSQL role and database, migrations (see Quick start) |
| `npm run dev` | Next.js dev server for `@devmentor/app` (pass flags after `--`, e.g. `npm run dev -- --port 3001`) |
| `npm run build` / `npm start` | Production build and server (always run with `NODE_ENV=production`) |
| `npm run lint` | ESLint for all packages, including the package-boundary rules |
| `npm run typecheck` | `tsc` for the root tooling and every package |
| `npm test` / `npm run test:watch` | Vitest: unit and component tests for all packages |
| `npm run test:coverage` | Unit tests with the 100% coverage gate (HTML report in `coverage/`) |
| `npm run test:integration` | After `npm run build`: ephemeral PostgreSQL (Testcontainers), the built app, and browser tests with agent-browser |
| `npm run audit` | `npm audit` gated by `audit-allowlist.json` (fails on new, expired or stale entries) |
| `npm run validate` | The full local gate: lint, typecheck, unit tests with coverage, build, audit |
| `npm run db:migration:create` | Generate a migration from entity changes (`-- --blank` for an empty one) |
| `npm run db:migrate` | Apply pending migrations (loads the root `.env`) |

Run a script in a single package with `-w`, for example `npm run migration:list -w @devmentor/db`. Add dependencies to the package that uses them: `npm install <pkg> -w @devmentor/db`.

Unit tests are colocated with the code as `src/**/*.test.{ts,tsx}`, and every change must keep coverage at 100%. Integration tests live in `test/integration/`. They need Docker for Testcontainers; without Docker, set `INTEGRATION_DATABASE_URL` to an admin connection string, and the suite creates and drops a throwaway database there.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

| Job | Runs |
| --- | --- |
| Lint & typecheck | `npm run lint`, `npm run typecheck` |
| Unit tests (100% coverage) | `npm run test:coverage`; the coverage report is uploaded as an artifact |
| Build | `npm run build` |
| Integration tests | `agent-browser install --with-deps`, `npm run build`, `npm run test:integration` (Testcontainers on the runner's Docker) |
| Dependency audit | `npm run audit` |


## Working with AI agents

Coding agents follow [`AGENTS.md`](AGENTS.md), which `CLAUDE.md` imports. The `.ai/` folder holds the project's agent metadata:

- `.ai/specs/`: specs for spec-driven development (`YYYY-MM-DD-slug.md`), with `implemented/` and `archive/` subfolders.
- `.ai/runs/`: logs of autonomous AI runs.
- `.ai/lessons.md` and `.ai/lessons/`: lessons learned.
