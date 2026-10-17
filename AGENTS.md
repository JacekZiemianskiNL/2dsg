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

## Packages

```
packages/
├── app/   @devmentor/app   Next.js application: routes, pages, server actions, composition root
├── core/  @devmentor/core  Framework-agnostic reusable logic: domain types, services, DI helpers, utilities
├── db/    @devmentor/db    Data layer: MikroORM config, entities, repositories, migrations, seeders
└── ui/    @devmentor/ui    Reusable React components: shadcn/ui components, Tailwind-based primitives
```

- **Dependency direction:** `app` → `core`, `db`, `ui`; `db` → `core`; `ui` → `core` (types/utilities only); `core` → no internal packages. No cycles, and nothing imports from `app`.
- Import other packages only by package name (`@devmentor/db`) through their `exports`, never by relative path into another package (`../../db/src/...`).
- Put code in the lowest package that can own it: no Next.js, React or MikroORM in `core`; no data access in `ui`; no business logic in `app` routes/pages beyond wiring.
- Internal packages ship TypeScript source (no build step); Turbopack transpiles workspace packages automatically. Each package has its own `package.json` (`"private": true`) and `tsconfig.json` extending a shared base.
- Add a dependency to the package that uses it (`npm install <pkg> -w @devmentor/<name>`), not to the root. Only shared tooling belongs at the root.
- A new package under `packages/` needs a spec and a README update.

## Data layer (`@devmentor/db`)

- MikroORM code is server-only: never import `@devmentor/db` from Client Components (`"use client"`), and mark server entry points with `import 'server-only'`.
- Define entities with `defineEntity` rather than decorators, so no `reflect-metadata` or decorator metadata is needed under SWC/Turbopack.
- One `MikroORM` instance per process, created lazily and cached on `globalThis` so dev HMR doesn't open new pools. Configure the connection pool in the MikroORM config; the connection string comes from the `DATABASE_URL` env var.
- Every request or job uses its own forked `EntityManager` (`orm.em.fork()`), provided through the request's DI scope. Never use the global `em` directly.
- Schema changes happen only through migrations in `packages/db/src/migrations`, generated with the MikroORM CLI and committed with the entity change. Never edit a migration that has been applied; add a new one. Don't use `schema:update` outside throwaway local databases.
- If Next.js fails to bundle a MikroORM package, add it to `serverExternalPackages` in `packages/app/next.config.ts`.

## Dependency injection (Awilix)

- The container is composed in one place: the composition root in `packages/app`. `core` and `db` export registration functions (e.g. `registerDb(container)`) instead of building their own containers.
- Lifetimes: process-wide resources (MikroORM instance, config, loggers) are `SINGLETON`. Anything that holds request state (`EntityManager`, repositories, current user) is `SCOPED`, resolved from `container.createScope()` per request, server action or job.
- Services receive dependencies through their constructor or factory function. Don't resolve from the container inside business logic (no service locator), and don't import singletons directly where they should be injected.
- Resolve the container only on the server (Route Handlers, Server Actions, Server Components, `proxy.ts`).

## UI

- **Frontend (public) pages** live in `packages/app/src/app/(frontend)/` and use Tailwind CSS utility classes.
- **Backend (admin) pages** live in `packages/app/src/app/(backend)/` and are built from shadcn/ui components.
- Add shadcn/ui components with the shadcn CLI in monorepo mode so they land in `packages/ui`, and import them as `@devmentor/ui/...`. Never copy shadcn components into `packages/app`. Change generated components only when you're deliberately customizing them.
- One Tailwind CSS 4 setup (CSS-first config) is shared by both areas. The app's CSS must register `packages/ui` as a Tailwind source (`@source`) so component classes are generated.
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
