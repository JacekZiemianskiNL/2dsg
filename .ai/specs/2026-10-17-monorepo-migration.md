# Monorepo migration and package scaffolding

- **Date:** 2026-10-17
- **Status:** Draft. Questions 1–3 are resolved; question 4 (health route) is still open
- **Related:** `AGENTS.md` (DevMentor architecture rules), `README.md` (Architecture)

## Context

The repository is the default single Next.js 16.3.4 app in `src/app/`: a starter page, `backdrop.tsx`, `globals.css` and `page.module.css`. `AGENTS.md` and `README.md` describe the target: an npm-workspaces monorepo with `app`, `core`, `db` and `ui` packages on PostgreSQL + MikroORM 7, Awilix, Tailwind CSS 4 and shadcn/ui. This spec covers getting from one to the other with working, verified wiring and no domain features.

## Goals

1. Convert the root into an npm-workspaces root and move the Next.js app into `packages/app` (`@devmentor/app`).
2. Scaffold `@devmentor/core`, `@devmentor/db` and `@devmentor/ui` following the rules in `AGENTS.md`.
3. Wire MikroORM (PostgreSQL, pooling, migrations, CLI) in `db` and the Awilix container in `app`, and prove both end to end with a health check.
4. Set up Tailwind CSS 4 and shadcn/ui, with the `(frontend)` and `(backend)` route groups each rendering one page. The backend area is served under `/admin`.
5. Keep `npm run dev`, `npm run lint` and `npm run build` working from the repo root. `openmercato.toml` runs `npm run dev -- --hostname 0.0.0.0 --port 3000`.
6. Upgrade Next.js to the latest 16.x, `eslint-config-next` to match, and React to the latest 19.x.

## Non-goals

- Domain entities, business features, authentication and authorization.
- A test framework (to be decided in a separate spec).
- CI/CD, deployment, Docker images for the app, and a Dockerized database (development uses the local PostgreSQL).
- Turborepo or other build orchestration (npm workspaces only).

## Design

### Root

```
.
├── package.json          private, "workspaces": ["packages/*"], engines.node ">=22.17"
├── package-lock.json     single lockfile
├── tsconfig.base.json    shared strict compiler options
├── eslint.config.mjs     flat config shared by all packages
├── .env.example          DATABASE_URL=postgresql://devmentor:devmentor@localhost:5432/devmentor
└── packages/{app,core,db,ui}
```

- The root `package.json` holds only shared tooling (`typescript`, `eslint`, `eslint-config-next`, `@types/node`). Its scripts forward to workspaces:
  - `dev`, `build`, `start` → `npm run <script> -w @devmentor/app`
  - `lint` → `eslint .`
  - `typecheck` → `tsc --noEmit` in every workspace (`npm run typecheck --workspaces --if-present`)
  - `db:migrate`, `db:migration:create` → forward to `@devmentor/db`
- `next` and `react` must hoist to the root `node_modules`, so the `node_modules/next/dist/docs/` path in `AGENTS.md` keeps working. Verify after `npm install`.
- `.gitignore`: the current patterns are root-anchored (`/node_modules`, `/.next/`). Change them to match in every package (`node_modules/`, `.next/`, `*.tsbuildinfo`, `next-env.d.ts`), and keep `.env*` ignored with `!.env.example`.
- Every internal package is `"private": true` and `"type": "module"`. Its `exports` point at TypeScript source (`"./src/index.ts"`) or source subpaths, with no build step.

### `packages/app` (`@devmentor/app`)

```
packages/app/
├── package.json        deps: next, react, react-dom, awilix, @devmentor/{core,db,ui}
├── next.config.ts
├── postcss.config.mjs  @tailwindcss/postcss
├── tsconfig.json       extends ../../tsconfig.base.json; paths "@/*" → "./src/*"
├── public/             moved from root
└── src/
    ├── app/
    │   ├── layout.tsx          root layout (html/body, globals.css)
    │   ├── globals.css         @import "tailwindcss"; shadcn theme; @source for packages/ui
    │   ├── (frontend)/page.tsx  "/", Tailwind-only page
    │   ├── (backend)/admin/layout.tsx
    │   ├── (backend)/admin/page.tsx  "/admin", built with @devmentor/ui components
    │   └── api/health/route.ts  GET → { status: "ok", db: "ok" }, running `select 1` through a scoped EntityManager
    └── server/
        ├── container.ts   composition root: createContainer(), registerCore(), registerDb()
        └── scope.ts       helper: create a request scope, run a callback with it, dispose it
```

- Move the existing `src/app` files with `git mv`, then replace the create-next-app starter with a minimal DevMentor placeholder page: delete `backdrop.tsx`, `page.module.css` and the starter CSS, and set metadata to DevMentor.
- The container is created lazily and cached on `globalThis` to survive HMR. `container.ts` and `scope.ts` start with `import 'server-only'`.
- `next.config.ts`: add `serverExternalPackages` only if the build fails to bundle a MikroORM package (`@mikro-orm/core` is externalized by default).

### `packages/core` (`@devmentor/core`)

```
packages/core/src/
├── index.ts
├── di/types.ts      Cradle base type and a RegisterFn = (container: AwilixContainer) => void
├── config/env.ts    typed, validated access to environment variables (throws on missing DATABASE_URL)
└── register.ts      registerCore(container): config (SINGLETON)
```

- `core` has no dependency on next, react or @mikro-orm/*. `awilix` is allowed for container types only.

### `packages/db` (`@devmentor/db`)

```
packages/db/
├── package.json  deps: @mikro-orm/core, @mikro-orm/postgresql, @mikro-orm/migrations, @devmentor/core
│                 devDeps: @mikro-orm/cli, tsx
│                 "mikro-orm": { "configPaths": ["./src/mikro-orm.config.ts"] }
│                 scripts: migration:create, migration:up, migration:down, migration:list
└── src/
    ├── index.ts           server-only public API
    ├── mikro-orm.config.ts defineConfig from @mikro-orm/postgresql: clientUrl from DATABASE_URL,
    │                        pool { min, max } from env (defaults 2 / 10), entities list,
    │                        migrations { path: "src/migrations", transactional: true },
    │                        extensions: [Migrator], discovery.warnWhenNoEntities: false
    ├── orm.ts             getOrm(): lazy MikroORM.init, cached on globalThis; closeOrm()
    ├── entities/index.ts  empty entity list (entities use defineEntity)
    ├── migrations/        committed migrations
    └── register.ts        registerDb(container): orm (SINGLETON, disposer closes the pool),
                           em (SCOPED, orm.em.fork())
```

- The MikroORM CLI (`npx mikro-orm`) loads the TypeScript config through `tsx`.
- `db` exposes no global `em`. Consumers get `em` from the DI scope.

### `packages/ui` (`@devmentor/ui`)

```
packages/ui/
├── package.json     exports: "./components/*", "./lib/*", "./styles.css"
├── components.json  shadcn config for the ui package (Tailwind v4: empty tailwind.config)
└── src/
    ├── components/  shadcn components (initially: button, card)
    ├── lib/utils.ts cn() helper
    └── styles.css   shadcn theme tokens, imported by the app's globals.css
```

- Initialize shadcn in monorepo mode: one `components.json` in `packages/app` and one in `packages/ui`, with matching `style`, `iconLibrary` and `baseColor`, and aliases resolving to `@devmentor/ui/...`. Run `shadcn add` from `packages/app` so base components land in `packages/ui`.

### Local database

Development uses a locally installed PostgreSQL server; this environment runs PostgreSQL 17 on `localhost:5432` with `DATABASE_URL` already set. There is no `compose.yaml`. `.env.example` documents the `DATABASE_URL` format, and the README's Getting started section explains how to create a role and database on a fresh machine (`createuser` / `createdb`).

## Implementation steps

1. Update `.gitignore`. Create the root workspace `package.json`, `tsconfig.base.json` and shared ESLint config.
2. `git mv` `src/`, `public/`, `next.config.ts`, `next-env.d.ts` (or regenerate it) and `tsconfig.json` into `packages/app`, then adjust the configs.
3. Scaffold `core`, `db` and `ui` with their `package.json`, `tsconfig.json` and source files.
4. `npm install`, upgrading next, react and react-dom to the latest stable versions. Confirm that `next` hoists to the root `node_modules`.
5. Set up Tailwind 4 and shadcn, and add `button` and `card`.
6. Wire the Awilix container and the health route.
7. Add `.env.example`. Run the checks below against the local PostgreSQL server.
8. Update `README.md` (Status, Getting started) and `AGENTS.md` if anything was decided differently. Move this spec to `.ai/specs/implemented/`.

## Acceptance criteria

- [ ] `npm install` at the root produces a single `package-lock.json`, with no lockfiles in packages.
- [ ] `npm run lint`, `npm run typecheck` and `npm run build` pass from the root.
- [ ] `npm run dev -- --hostname 0.0.0.0 --port 3000` (the `openmercato.toml` preview command) serves the app.
- [ ] `/` renders a Tailwind-styled page, and `/admin` renders shadcn `Button` and `Card` from `@devmentor/ui` with correct styles.
- [ ] With PostgreSQL running, `GET /api/health` returns `200 {"status":"ok","db":"ok"}`. With the database stopped, it returns `503` without crashing the server.
- [ ] `npm run db:migration:create` and `npm run db:migrate` run against the local database.
- [ ] Repeated HMR reloads in dev don't grow the number of PostgreSQL connections (check `pg_stat_activity`).
- [ ] The import rules hold: `core` imports none of next, react or @mikro-orm/*; no package imports from `app`; no relative imports cross package boundaries.
- [ ] `node_modules/next/dist/docs/` exists at the repo root.

## Decisions

1. **Local PostgreSQL:** use the locally installed server, not Docker (decided 2026-10-17).
2. **Starter page:** replace it with a minimal DevMentor placeholder (decided 2026-10-17).
3. **Backend route prefix:** `/admin`. The route group stays `(backend)` (decided 2026-10-17).

## Open questions

4. **Health route:** keep `/api/health` permanently, or remove it once the wiring is verified? If it stays, it returns only `ok` or `error`, never error details or versions. The default is to keep it.
