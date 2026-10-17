# Monorepo migration, phase 3: UI

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-monorepo-migration.md` (phase 3)

## Goal

- Set up Tailwind CSS 4 and shadcn/ui in `packages/ui`.
- Replace the starter with a DevMentor placeholder in `(frontend)`.
- Add the `(backend)/admin` page built from shadcn components.

## Actions taken

- Added `tailwindcss` and `@tailwindcss/postcss` (v4) to `packages/app`, with `postcss.config.mjs`.
- Wrote `components.json` in `packages/app` and `packages/ui` (base-nova, neutral, lucide, `@devmentor/ui` aliases), following the shadcn monorepo docs. Pointed the ui `exports` at `./globals.css` and added the tsconfig path for `@devmentor/ui/*`.
- Ran `shadcn add button card` from `packages/app`, which wrote `packages/ui/src/components/{button,card}.tsx`.
- `init` would have overwritten `components.json`, so I ran it in a scratch app under tmp instead. Ported its theme CSS into `packages/ui/src/styles/globals.css`, and its dependencies into `packages/ui`: `@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`, `shadcn`.
- Replaced clsx and tailwind-merge with shadcn's `cn` package, re-exported from `lib/utils.ts`.
- Removed the starter files.
- Added:
  - A new root layout: DevMentor metadata and Geist, importing `@devmentor/ui/globals.css`.
  - `(frontend)/page.tsx`.
  - `(backend)/admin/{layout,page}.tsx`.
  - `server/health.ts`, now shared by `/api/health` and `/admin`.
- Updated the UI rules in `AGENTS.md` and the README, and the design and progress sections of the spec.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` / `typecheck` / `build` | PASS. Routes: `/` static; `/admin` and `/api/health` dynamic |
| Dev `GET /`, `/admin`, `/api/health` | 200 / 200 / 200 |
| Served CSS contains frontend utilities (`sm:text-6xl`, `text-muted-foreground`), Card (`ring-foreground/10`), Button (`hover:bg-muted`), theme variables, tw-animate | Yes |
| Headless Chromium screenshots | `/` shows the placeholder in Geist, title "DevMentor". `/admin` shows the Card with "Database: Operational" and the outline Button (1px border, 10px radius), title "Admin \| DevMentor" |

The first screenshot run showed a stale root layout from the running dev server. Restarting it with a clean `.next` fixed that, and I recorded a lesson.

## Outcome

Phase 3 done.

## Follow-ups

- Phase 4:
  - Close out the README and `AGENTS.md`, and move the spec to `implemented/`.
  - Full-project verification: a clean install, build, the available checks, and app startup.

## Lessons added

- `2026-10-17-shadcn-cli-in-existing-monorepo`
- `2026-10-17-dev-server-stale-root-layout`
- `2026-10-17-headless-chromium-without-root`
