# Monorepo migration and package scaffolding

- **Date:** 2026-10-17
- **Status:** Approved 2026-10-17, implementation in progress (see Plan and progress)
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
├── package.json  deps: @mikro-orm/core, @mikro-orm/postgresql, @mikro-orm/migrations, awilix, server-only, @devmentor/core
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

## Plan and progress

Each phase ends with `npm run lint`, `npm run typecheck` and `npm run build` passing from the root. Record progress here as phases complete.

### Phase 1: Workspace and package split (behavior-preserving)

- Make the root an npm workspace:
  - `package.json` with forwarding scripts, a single lockfile and `tsconfig.base.json`.
  - A shared ESLint config.
  - Update `.gitignore` and add `.env.example`.
- Move the app into `packages/app` without changing behavior: the starter page at `/` renders exactly as before.
- Scaffold `core`, `db` and `ui`, each with `package.json`, `exports`, `tsconfig.json`, `typecheck` and its first public API:
  - **core:** typed env config, DI types and `registerCore`.
  - **db:** MikroORM config, `getOrm`/`closeOrm`, `registerDb` and the migration CLI scripts.
  - **ui:** `cn()`.
- Wire the dependency graph (`app` → `core`/`db`/`ui`, `db` → `core`) and the composition root in `packages/app/src/server/`.
- Upgrade next to 16.4.2 and react/react-dom to 19.3.1.

Done when:
- `npm install` produces a single lockfile, and `next` is hoisted to the root.
- lint, typecheck and build pass.
- The preview command serves `/` unchanged.
- No cross-package relative imports, and `core` doesn't import next, react or MikroORM.

### Phase 2: Runtime wiring (database + DI)

- `/api/health` resolves a request scope and runs `select 1`.
- Run the migration CLI against the local PostgreSQL, keeping the initial migrations folder.
- Check that HMR doesn't grow the connection pool.

Done when:
- `/api/health` returns 200 with the database available and 503 without it.
- `db:migration:create` and `db:migrate` work.
- The connection count is stable across reloads.

### Phase 3: UI

- Set up Tailwind CSS 4 and shadcn in monorepo mode, adding `button` and `card` to `packages/ui`.
- Replace the starter with a DevMentor placeholder in `(frontend)/`.
- Add the `(backend)/admin` page.

Done when:
- `/` renders a Tailwind-styled placeholder.
- `/admin` renders the shadcn `Button` and `Card` with correct styles.

### Phase 4: Close-out

- Update the README (Status, Getting started) and `AGENTS.md` for anything decided differently.
- Move this spec to `.ai/specs/implemented/`.

Done when every acceptance criterion below is checked.

### Progress

| Phase | Status | Notes |
| --- | --- | --- |
| 1 | Done 2026-10-17 | lint, typecheck, build pass; `/` serves the unchanged starter page through the root `npm run dev`; `mikro-orm debug` loads the TS config and connects. See the phase 1 notes below. |
| 2 | Not started | |
| 3 | Not started | |
| 4 | Not started | |

### Phase 1 notes

- **Moving directories:** the workspace runs on overlayfs, so `git mv` of directories fails with `EXDEV`. `src/` and `public/` were copied and the originals deleted; git still records the moves as renames.
- **Starter page:** kept as-is at `packages/app/src/app/page.tsx`, with `backdrop.tsx` and `page.module.css`. Moving it to `(frontend)/` and replacing it is phase 3.
- **NODE_ENV:** the sandbox exports `NODE_ENV=development`, which makes `next build` fail while prerendering `/_global-error` (`Cannot read properties of null (reading 'useContext')`). The original single-app repo fails the same way. Fix: the app's `build` and `start` scripts set `NODE_ENV=production`. This is POSIX-shell syntax; revisit if Windows support is needed.
- **Tooling versions:** TypeScript stays on 5.x and ESLint on 9.x, as in the original template. The latest majors are TypeScript 7 (the native compiler) and ESLint 10, but upgrading them is outside this spec.
- **`noUncheckedIndexedAccess`:** not enabled. The original config didn't have it, and the starter `backdrop.tsx` fails it.
- **Import rules in `eslint.config.mjs`:**
  - `import/no-relative-packages`: no relative imports across packages.
  - `no-restricted-imports`: `core` imports nothing from next, react, @mikro-orm or other `@devmentor/*` packages; `db` and `ui` don't import `@devmentor/app`.
  - Verified with throwaway files that violated each rule.
- **Composition root:** `packages/app/src/server/container.ts` and `scope.ts` exist and typecheck, but nothing calls them until `/api/health` (phase 2).
- **Next.js packages:** `serverExternalPackages` wasn't needed so far, because nothing in the build imports `@devmentor/db` yet. Re-check this in phase 2.

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
4. **Health route:** keep `/api/health` permanently. It returns only `{"status":"ok","db":"ok"}` (200) or `{"status":"error","db":"error"}` (503), with no error details, versions or hostnames (decided 2026-10-17).
