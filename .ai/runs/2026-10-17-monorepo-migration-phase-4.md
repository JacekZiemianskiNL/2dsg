# Monorepo migration, phase 4: close-out and full verification

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-monorepo-migration.md` (phase 4)

## Goal

Verify the whole project from a clean install, close out the docs, and move the spec to `implemented/`.

## Actions taken

- Stopped the pm2 preview, deleted all `node_modules`, `.next`, `next-env.d.ts` and tsbuildinfo, and ran `npm ci`.
- Ran lint, typecheck and build.
- Started the production server through the root `npm start`, with the database up and then unreachable.
- Restarted the pm2 dev preview and checked the routes, the migration CLI, connection counts across HMR, and screenshots.
- Investigated the `npm audit` output. It's one unpatched advisory in `braces`, recorded as a known issue in the spec.
- README: Status (complete), a step-by-step Getting started (database setup, migrate, dev) and a Commands table.
- `AGENTS.md`: a Commands section with the required checks.
- Spec: ticked every acceptance criterion, marked phase 4 done with verification notes, and moved it to `.ai/specs/implemented/` with `git mv`.

## Verification

See "Phase 4 notes" in the spec for the full table. In summary:
- `npm ci` is clean and the tree is unchanged.
- lint, typecheck and build all PASS.
- There are no tests: no framework and no `test` script.
- Production startup: `/` 200, `/admin` 200 (Operational), `/api/health` 200, unknown path 404.
- Database unreachable: `/` 200, `/admin` 200 (Unavailable), `/api/health` 503.
- Dev preview: all routes 200.
- Migrations work, and connections stay stable at 1.

## Outcome

Done. The monorepo migration is complete.

## Follow-ups

- Choose and add a test framework (a separate spec).
- Re-check GHSA-vfj7-8cjw-p6xm (`braces`) when a patch is released.
- If Windows development is needed, the `NODE_ENV=production next build/start` scripts need a cross-platform form.
- `next/font/google` downloads Geist at build time, so offline builds would need the `geist` package or local fonts.
