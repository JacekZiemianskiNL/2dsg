# Architecture docs for DevMentor

- **Date:** 2026-10-17
- **Related spec:** none (documentation only; the monorepo migration will need its own spec)

## Goal

Record the DevMentor architecture decisions in `AGENTS.md` (as rules for agents) and `README.md` (as architecture notes):

- Next.js + TypeScript + React
- PostgreSQL + MikroORM
- Awilix DI
- Tailwind for frontend pages, shadcn/ui for backend pages
- npm-workspaces monorepo with `app`, `core`, `db` and `ui` packages

## Actions taken

- Checked the latest versions on npm: next 16.4.2 (16.3.4 installed), @mikro-orm/core 7.2.5, awilix 13.0.5, tailwindcss 4.3.3, shadcn 4.22.0.
- Inspected the MikroORM 7 packages:
  - It uses Kysely and `pg` (no longer knex).
  - It requires Node >= 22.17.
  - It exports `defineEntity`.
- Read the bundled Next.js docs:
  - `transpilePackages`: Turbopack transpiles workspace packages automatically.
  - `serverExternalPackages`: `@mikro-orm/core` is externalized by default.
  - Version 16 upgrade guide: `middleware` was renamed to `proxy`.
- Added a "DevMentor: architecture rules" section to `AGENTS.md`.
- Replaced the create-next-app boilerplate in `README.md` with architecture notes.

## Files changed

- `AGENTS.md`
- `README.md`
- `.ai/runs/2026-10-17-architecture-docs.md`

## Verification

Documentation only, so there was no code to lint or build. I checked the stated versions and APIs against the npm registry and the installed Next.js docs.

## Outcome

Done.

## Follow-ups

- Done: wrote the monorepo migration spec at `.ai/specs/2026-10-17-monorepo-migration.md`. Before writing it, I checked:
  - MikroORM 7's `pool` and `discovery.warnWhenNoEntities` options.
  - How the CLI finds its config (`configPaths`) and loads TypeScript (via `tsx`).
  - shadcn's monorepo setup, which needs a `components.json` in both the app and the ui package.
- Open: the user needs to answer the spec's open questions and approve it before implementation. The spec includes the next 16.4.x upgrade.
