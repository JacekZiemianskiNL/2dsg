# Apply the engineering standards

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-engineering-standards.md`
- **Source document:** `.ai/docs/engineering-standards.md` (added by the user)

## Goal

Implement the engineering standards in this repo: the architecture, the shared API/UI layers, tests and the validation gate, and the binding rules in `AGENTS.md`.

## Actions taken

- **Gap analysis:** compared the document against the code.
  - It was written for a different bootstrap: its migration steps 1, 3 and 8 refer to files that don't exist here.
  - It prescribes the legacy `force-dynamic` config.
  - Its dependency direction conflicts with the current architecture.
- **Asked the user** three questions and got these decisions:
  - Adopt `app → core → db` with `ui` standalone.
  - Build the shared layers plus tests now, and defer auth, events and validators until the first concept needs them.
  - Add Vitest.
- **Spec:** wrote it with five phases, committed per phase on `feat/engineering-standards`:
  1. `ccd9ec6`: the dependency flip, the container and Cradle in core, a Zod env, the pino logger, `HealthService`, boundary and code-quality lint rules.
  2. `4b26d51`: Vitest projects, the server-only stub, the audit gate with allowlist, `npm run validate`.
  3. `11eb4fa`: `core/src/http` (errors, envelope, `apiHandler`, `parseJsonBody`, `makeCrudRoute`), `/api/health` on the envelope, the container-cache fix.
  4. `778c7f8`: `ui/src/backend` (`apiCall`, feedback, `CrudForm`, `DataTable`), shadcn primitives moved to `components/ui`, the `fetch` lint ban, `(marketing)`, and `/admin` going through `apiCall`.
  5. `AGENTS.md`/README conventions and standards, plus full verification (this commit).

## Verification

See the phase notes and the phase 5 table in the spec. Final result after a clean `npm ci`:
- `npm run validate` exits 0: 81 tests, build, and audit through the allowlist.
- Production and dev startup work with the database up and down.
- Headless Chromium screenshots of `/` and `/admin` look correct, with Operational and Unavailable states as expected.

## Outcome

Done.

## Issues found and fixed along the way

- **DI container cache:** caching the container on `globalThis` caused stale classes after HMR and mixed class identities across Next's route and page bundles (500s). It's now cached per module. Lesson: `2026-10-17-no-globalthis-container`.
- **Test helper location:** a shared root `test/` helper imported from packages broke `import/no-relative-packages`, so it moved into `packages/core/src/testing/`.
- **Hooks lint:** fixed a React hooks finding (synchronous `setState` in an effect) in the admin status card.
- **Killed the wrong process:** a cwd-based process filter killed the pm2 dev server (pm2 restarted it). The process-management lesson now says to identify test servers by the parent's `--port` flag.

## Follow-ups

- **The first domain concept** should follow section 2 of the standards. Likely the auth concept, which brings `core/src/http/auth.ts`, `validators/`, `base.entity.ts` and the password/JWT/cookie/rate-limit rules.
- **`docs/product-scope.md`** (standards step 8) doesn't exist in this repo, so there was nothing to reconcile.
- **`makeCrudRoute`, `CrudForm` and `DataTable`** are only proven by unit tests until the first CRUD concept uses them.
- **GHSA-vfj7-8cjw-p6xm** must be re-reviewed by 2027-01-17 (`audit-allowlist.json`).

## Lessons added

- `2026-10-17-no-globalthis-container`
- `2026-10-17-pkill-f-kills-own-shell` (updated)
