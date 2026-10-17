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
| Package manager | npm workspaces (keep `package-lock.json`; don't add pnpm/yarn lockfiles) |
| Runtime | Node.js >= 22.17 (MikroORM 7 requirement) |

Use the latest stable versions. Before using a library API, check the installed version's docs/types; don't rely on memory from older majors.

## Commands

Run from the repo root:
- `npm run lint`, `npm run typecheck` and `npm run build` must pass before a change is done. There's no test framework yet.
- For UI or behavior changes, also check the running app:
  - `npm run dev` starts it; in this sandbox, the pm2 `workspace-preview` process serves it on port 3000.
  - Use `GET /api/health` for the database.
- Migrations: `npm run db:migration:create` and `npm run db:migrate`. See `README.md` for the full list.

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

- **Frontend (public) pages** live in `packages/app/src/app/(frontend)/` and use Tailwind CSS utility classes.
- **Backend (admin) pages** live in `packages/app/src/app/(backend)/admin/`, are served under `/admin`, and are built from shadcn/ui components.
- Add shadcn/ui components by running `npx shadcn@latest add <component>` from `packages/app`. The CLI writes them to `packages/ui/src/components/`. Import them as `@devmentor/ui/components/<name>`. Don't run `shadcn init`: it overwrites the monorepo `components.json`. Never copy shadcn components into `packages/app`. Change generated components only when you're deliberately customizing them.
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
└── lessons/             # Detailed lessons: YYYY-MM-DD-slug.md
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
- **Prove it works.** A change is done only when verified: run `npm run lint` and `npm run build` (plus tests, once they exist), and exercise UI or behavior changes in the running app. Report failures as they are; never claim success without running the checks.
- **Own bug fixes.** Given a bug report, error log or failing check, reproduce it, find the root cause and fix it without step-by-step guidance. If a fix feels hacky, scrap it and implement the clean solution.
- **Use subagents** for broad codebase searches and independent parallel work, to keep the main context focused.
