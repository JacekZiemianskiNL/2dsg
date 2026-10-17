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
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix) | One composition root, per-request scopes |
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
app ──┬──► db ──► core
      ├──► ui ──► core
      └──► core
```

- `app` depends on `core`, `db` and `ui`.
- `db` depends on `core`.
- `ui` depends only on `core` types and utilities.
- `core` has no internal dependencies and stays free of Next.js, React and MikroORM.
- Packages import each other by name (`@devmentor/db`) through their `exports`. Internal packages ship TypeScript source, and Turbopack transpiles them, so they have no separate build step.

## Architecture

### Request flow

```
HTTP request / Server Action / job
        │
        ▼
packages/app ── container.createScope() ──► scoped: EntityManager (orm.em.fork()), repositories, current user
        │                                    singleton: MikroORM instance (connection pool), config, logger
        ▼
@devmentor/core services ──► @devmentor/db repositories ──► PostgreSQL
```

### Dependency injection (Awilix)

- The container is built once, in the composition root in `packages/app`.
- `core` and `db` export registration functions, for example `registerDb(container)`, which the composition root calls. They don't build their own containers.
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
- Configuration comes from environment variables. `DATABASE_URL` is the PostgreSQL connection string; `.env*` files are git-ignored.

### UI

| Area | Route group | Styling |
| --- | --- | --- |
| Frontend (public pages) | `packages/app/src/app/(frontend)/` | Tailwind CSS utilities |
| Backend (admin pages, `/admin`) | `packages/app/src/app/(backend)/admin/` | shadcn/ui components from `@devmentor/ui` |

- shadcn/ui components (style `base-nova`, built on Base UI) live in `packages/ui/src/components`. Add more by running `npx shadcn@latest add <component>` from `packages/app`.
- Both areas share one Tailwind CSS 4 stylesheet, `@devmentor/ui/globals.css`, which holds the theme tokens and the `@source` entries for `packages/ui` and `packages/app`.

## Getting started

Requirements: Node.js >= 22.17 and a running PostgreSQL server.

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create a database and point `DATABASE_URL` at it. The variables are listed in `.env.example`. For example, on a local PostgreSQL:

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
| `npm run dev` | Next.js dev server for `@devmentor/app` (pass flags after `--`, e.g. `npm run dev -- --port 3001`) |
| `npm run build` / `npm start` | Production build and server (always run with `NODE_ENV=production`) |
| `npm run lint` | ESLint for all packages, including the package-boundary rules |
| `npm run typecheck` | `tsc --noEmit` in every package |
| `npm run db:migration:create` | Generate a migration from entity changes (`-- --blank` for an empty one) |
| `npm run db:migrate` | Apply pending migrations |

Run a script in a single package with `-w`, for example `npm run migration:list -w @devmentor/db`. Add dependencies to the package that uses them: `npm install <pkg> -w @devmentor/db`.

There is no test framework yet. `lint`, `typecheck` and `build` are the automated checks.

## Working with AI agents

Coding agents follow [`AGENTS.md`](AGENTS.md), which `CLAUDE.md` imports. The `.ai/` folder holds the project's agent metadata:

- `.ai/specs/`: specs for spec-driven development (`YYYY-MM-DD-slug.md`), with `implemented/` and `archive/` subfolders.
- `.ai/runs/`: logs of autonomous AI runs.
- `.ai/lessons.md` and `.ai/lessons/`: lessons learned.
