# Code review rules

How changes to DevMentor are reviewed, by humans and by `om-code-review` (which applies this file automatically). These are the repo-specific checks. The full checklist is section 1 of [`.ai/docs/engineering-standards.md`](.ai/docs/engineering-standards.md) (also wired in as `reviewChecklist` in `.ai/agentic.config.json`), and [`AGENTS.md`](AGENTS.md) wins where the two disagree.

## Review priorities

In this order:

1. **Correctness:** the change does what its spec or ticket says, including the unhappy paths.
2. **Security:** the security minimums in `AGENTS.md` hold (see below).
3. **Contracts:** nothing in [`BACKWARD_COMPATIBILITY.md`](BACKWARD_COMPATIBILITY.md) breaks without its required path.
4. **Architecture and layering:** the package and layer rules hold.
5. **Tests:** 100% unit coverage, plus integration coverage for user-facing flows.
6. **Quality:** naming, readability, no dead code.

## The gate

A PR isn't reviewable until the validation gate is green: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run build` and `npm run audit` (together, `npm run validate`). The CI `integration` job must also pass. A red required check is a **blocker** finding, reported together with the full review rather than instead of it.

## Repo-specific checks

### Packages and layering

- The dependency direction is `app → core → db`, and `ui` is imported only by `app`. Packages import each other by package name through `exports`, never by relative path into another package. Loosening the `no-restricted-imports` ESLint rule is a **blocker**.
- Only `@devmentor/db` imports `@mikro-orm/*`. `core` never imports Next.js or React. A page or route never issues a query: it calls a `core` service through `withScope`.
- Entry points of `db` and `core` keep `import "server-only"`. Nothing under `"use client"` imports them.
- A new package under `packages/`, a new ORM, DI library, CSS framework, component kit or package manager needs an approved spec in `.ai/specs/`. Without one it's a **blocker**.
- A dependency belongs to the workspace that uses it (`-w @devmentor/<name>`), not to the root. Don't add a dependency for something 20 lines of local code would cover.

### Domain concepts

- Concept folders are plural single words, repeated with the same name across layers: `db/src/entities/<concept>/`, `core/src/services/<concept>/`, `core/src/validators/<concept>/`, `app/src/app/api/<concept>/`, `ui/src/components/<concept>/`. No empty scaffold folders.
- Entities use `defineEntity`, no decorators, and are registered in `entities/index.ts`. Tables and columns are snake_case, tables are plural, IDs are UUIDs.
- Services are `<Name>Service` in `<name>.service.ts`. Each one is registered by hand in `container.ts` (`asClass(...).scoped()` for anything that holds request state) and typed in `cradle.ts`. No `loadModules` and no service locator inside business logic.
- Event IDs are `concept.entity.action` in the past tense, emitted only after a successful mutation.

### API routes

- Every route handler is wrapped in `apiHandler` or built with `makeCrudRoute`. A hand-written `try/catch` or a `Response.json` error path in a route is a **major** finding.
- `authorize` is always explicit. Public endpoints say `publicRoute`. A missing or permissive check on a non-public route is a **blocker**.
- Bodies are read only with `parseJsonBody(request, schema)`, against a shared Zod schema in `core/src/validators/`. Write paths use the parsed output only, so there's no mass assignment (**blocker**).
- Services throw `AppError` subclasses and never build HTTP responses. An error `message` is client-visible and must not leak internals.
- If `core/src/http/envelope.ts` and `ui/src/backend/api/types.ts` both change, they change identically in the same PR.

### Client and UI

- `fetch` only through `apiCall`/`apiCallOrThrow`. Forms use `CrudForm`, lists use `DataTable`, and loading, error and empty states use the `feedback` components. Anything bespoke needs a reason stated in the PR.
- shadcn primitives arrive through `npx shadcn@latest add` (run from `packages/app`) into `packages/ui/src/components/ui/`. They're never hand-written or copied into `app`.
- Public pages live in persona route groups and use Tailwind utilities. Admin pages live under `(backend)/admin/` and use shadcn/ui. There's one global stylesheet (`@devmentor/ui/globals.css`), class names are merged with `cn`, and Server Components are the default.
- Request-time rendering uses `await connection()` from `next/server`, never `export const dynamic = "force-dynamic"`.

### Data and persistence

- Every schema change ships a generated migration in `packages/db/src/migrations` along with the entity change. Editing an applied migration, or relying on `schema:update`, is a **blocker**.
- Each request uses its own forked `EntityManager` from the DI scope, never the global `em`. The MikroORM instance is the only thing cached on `globalThis`; the container is not.
- Check-then-write on shared state (slot availability, booking status) runs in one transaction, backed by a unique constraint (**blocker** for bookings and payments). Retryable transitions such as payment confirmation and webhooks are idempotent.
- The app must still build and boot with no database reachable: all DB access happens at request time.

### Security

These are the `AGENTS.md` minimums, and each is a **blocker** unless marked otherwise:

- Auth is enforced server-side, and the specific record is authorized (ownership). Any error inside a security check fails closed.
- No raw SQL is built from user input. Prices are recomputed on the server (`mentor.rate × duration`), and a client-supplied price is never persisted.
- Passwords use bcrypt with cost ≥ 12, or argon2id at the stated parameters. JWTs are HS256 or stronger, with a ≥ 32-byte secret from the validated env and a short expiry, and there's no refresh flow.
- Cookies are `httpOnly`, `secure` in production, `sameSite=lax` (or `strict` for auth-only routes) and path-scoped. Tokens never go in `localStorage`. The CSRF header check stays intact.
- Login, register and password reset have a per-IP+email attempt counter (**major**). Auth errors are generic.
- No secret, token, password or full JWT appears in a log line, response or client payload. A new sensitive field is added to the logger's redaction list.

### Code quality

- No `any`, no empty `catch`, no swallowed errors and no `console`. Errors are handled, logged through the shared pino logger with context, or rethrown.
- No magic numbers or strings: name the constant and explain the value. Booleans read positively, and there are no bare `true`/`false` arguments at call sites.
- No dead code, commented-out code or debug output. Comments explain only a non-obvious *why*.
- The diff traces entirely to its stated purpose, with no drive-by renames or formatting passes.

### Tests

- Coverage stays at **100%** lines, branches, functions and statements. Lowering thresholds, adding `v8 ignore`/`istanbul ignore`, or widening the coverage `exclude` list without an approved spec is a **blocker**. An unreachable branch is dead code and gets removed.
- A behavior change ships a test that fails on the old code. A bug fix ships a regression test (**major**, or **blocker** when the fix is security-relevant).
- Every new page, API route or user-visible behavior gets an integration test in `test/integration/`: real HTTP for APIs, agent-browser for pages, asserting what a user sees. Race-sensitive flows such as booking and reschedule get a concurrent-case integration test.
- Unit tests are colocated as `src/**/*.test.{ts,tsx}`. Mocking happens at package boundaries with `vi.mock`, never through test-only branches in production code.

### Process

- A non-trivial change has a spec in `.ai/specs/`, which moves to `implemented/` when done. An autonomous run leaves a log in `.ai/runs/`. Lessons go in `.ai/lessons/` and are indexed in `.ai/lessons.md`.
- A new or renamed gate script updates `.github/workflows/ci.yml` in the same change, and a new CI job is added to `main`'s required checks.

## Severity

| Severity | Meaning | Examples here |
|---|---|---|
| **blocker** | Must be fixed before merge | Security minimum violated, layering rule broken, coverage workaround, applied migration edited, red required check, unapproved contract break |
| **major** | Should be fixed in this PR; merging needs an explicit reason | Hand-rolled route error handling, bespoke form/table/fetch without a reason, missing integration test for a new page or route, missing regression test |
| **minor** | Worth fixing; may become a follow-up issue | Naming drift, unclear constant name, a missing *why* comment |
| **nit** | Optional polish | Wording, ordering |

Any blocker or major finding means the verdict is `changes-requested`.
