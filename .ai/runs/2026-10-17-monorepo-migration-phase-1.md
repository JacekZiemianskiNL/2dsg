# Monorepo migration, phase 1: workspace and package split

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-monorepo-migration.md` (phase 1)

## Goal

Turn the repo into an npm-workspaces monorepo:
- Move the Next.js app into `packages/app`.
- Scaffold `core`, `db` and `ui` with their first public APIs.
- Wire the inter-package dependencies, imports and scripts.

Existing behavior must be preserved.

## Plan

The spec had implementation steps but no phases, so I added a "Plan and progress" section to it: four phases, each with completion criteria. This run implements phase 1.

## Actions taken

- Stopped the pm2 `workspace-preview` process during the move and restarted it afterwards.
- Moved `src/`, `public/`, `next.config.ts` and `tsconfig.json` into `packages/app`:
  - Copied and deleted the directories, because of overlayfs EXDEV.
  - Deleted the generated `next-env.d.ts` and `.next/`.
  - Briefly deleted the starter files, then restored them to preserve behavior.
- Root:
  - `package.json` is now the workspace root, with forwarding scripts: dev, build, start, lint, typecheck, db:migrate and db:migration:create.
  - Added `tsconfig.base.json` and `.env.example`.
  - `.gitignore` patterns now match in every package.
  - ESLint gained `import/no-relative-packages` and `no-restricted-imports` rules enforcing the package boundaries.
- Regenerated `package-lock.json` with:
  - next 16.4.2 and eslint-config-next 16.4.2 (from 16.3.4)
  - react and react-dom 19.3.1 (from 19.2.8)
  - TypeScript 5 and ESLint 9 kept
- `@devmentor/core`: `loadConfig()` (typed env with validation), `CoreCradle`, `RegisterFn` and `registerCore()`.
- `@devmentor/db`:
  - `createOrmConfig()`, `mikro-orm.config.ts` (the CLI entry, with no server-only import), `getOrm()`/`closeOrm()` cached on globalThis, and `registerDb()` (orm as a value, `em` scoped via `orm.em.fork()`).
  - An empty entity list and a `migrations/` folder.
  - Migration scripts, with the CLI loading TypeScript via `tsx`.
- `@devmentor/ui`: `cn()` (clsx + tailwind-merge), with `exports` for components, lib, hooks and styles.css.
- `@devmentor/app`:
  - `src/server/container.ts` (composition root: strict Awilix container, PROXY mode, cached on globalThis) and `src/server/scope.ts` (`withScope`).
  - The `build` and `start` scripts force `NODE_ENV=production`.

## Verification

Run from the repo root with the sandbox's `NODE_ENV=development`:
- `npm run lint`: PASS
- `npm run typecheck` (all 4 workspaces; the app runs `next typegen` first): PASS
- `npm run build`: PASS (Next.js 16.4.2, Turbopack; routes `/` and `/_not-found`)
- Preview (`npm run dev --hostname 0.0.0.0 --port 3000` via pm2) runs `next dev` in `packages/app`. `GET /` returns 200 with the unchanged starter page.
- `npx mikro-orm debug` in `packages/db`: config found, TypeScript via tsx, connected to the database.
- Import rules: throwaway files violating each rule produced the four expected ESLint errors, and were then deleted.
- One `package-lock.json`, no per-package `node_modules`, `node_modules/next/dist/docs/` present.
- Before the fix, `npm run build` failed. Building with NODE_ENV unset passed, and a scratch worktree of the original commit failed the same way.

## Outcome

Phase 1 done.

## Follow-ups

- Phase 2:
  - `/api/health`.
  - The first migration run against the local PostgreSQL.
  - The HMR connection-count check.
  - Re-check whether `serverExternalPackages` is needed once `@devmentor/db` is bundled.
- Phase 3: Tailwind 4 and shadcn, the `(frontend)` placeholder replacing the starter, and `/admin`.
- The `unrs-resolver` postinstall script is blocked by npm 11's install-scripts policy. Lint works without it, so it's left as is.

## Lessons added

- `2026-10-17-node-env-breaks-next-build`
- `2026-10-17-overlayfs-git-mv-exdev`
