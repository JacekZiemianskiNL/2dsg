# GitHub CI, 100% unit coverage and browser integration tests

- **Date:** 2026-10-17
- **Related spec:** `.ai/specs/implemented/2026-10-17-ci-and-test-coverage.md`
- **Branch:** `feat/ci-and-coverage`, based on `feat/engineering-standards`

## Goal

- A PR workflow with build, lint, unit tests and integration tests.
- Integration tests on an ephemeral Testcontainers PostgreSQL, with the app driven by agent-browser.
- An `AGENTS.md` rule that every feature must be 100% unit-covered.
- 100% coverage of the existing code.

## Actions taken

- **Research:**
  - agent-browser 0.39.1 (Vercel Labs): a native CLI with `--session` and `--json`. `install --with-deps` sudo-installs Chrome dependencies, browsers are stored in `~/.agent-browser/browsers`, and it requires Node 24 or newer.
  - Testcontainers 12 `PostgreSqlContainer`.
  - Vitest 5 coverage thresholds and `provide`/`inject`.
- **Sandbox constraints:** no Docker here, so Testcontainers can only run in CI. Locally the suite uses `INTEGRATION_DATABASE_URL`, which creates and drops a throwaway database.
- **`00e5558`, coverage:**
  - The coverage gate, plus `app` and `tooling` Vitest projects, and 69 new tests (150 total).
  - Testability refactors: the logger destination, the audit gate split into a library, and the status card's view state with an error-boundary rethrow.
  - Removed unreachable `CrudForm` fallbacks.
- **`178215c`, integration framework:** the harness and 8 tests (health API, pages in the browser, database outage).
- **This commit:**
  - The CI workflow, a composite setup action and `.nvmrc`.
  - `AGENTS.md` and README rules and docs, and Node 24 in `engines`.

## Verification

- **Coverage:** 100% lines, branches, functions and statements over 43 tracked files.
- **Clean install:** `npm ci` passes, then `npm run validate` exits 0.
- **Integration:** `npm run test:integration` passes 8/8. Throwaway databases and app processes are cleaned up.
- **Harness failure modes:** a missing build gives a clear error, and a missing Docker runtime gives the Testcontainers runtime error.
- **Workflow:** actionlint passes on the workflow.
- **On GitHub:** the user approved a push and a draft PR. PR #1 (https://github.com/JacekZiemianskiNL/2dsg/pull/1), run 39026337223, had all 5 jobs green on the first attempt.
  - Integration: 8/8 passed, with `agent-browser install --with-deps` installing Chrome and Testcontainers PostgreSQL (no `INTEGRATION_DATABASE_URL` in CI).
  - Unit: 150 tests, 100% on all metrics.

## Outcome

Done. The integration path was verified on GitHub.

## Issues found along the way

- **`/` text assertion:** agent-browser `wait --text` matches rendered text, so CSS `uppercase` turned "Coming soon" into "COMING SOON". Recorded as a lesson.
- **A claim I retracted:** I suspected `CrudForm`'s state-based double-submit guard was ineffective. The regression test passed on the original code, so I reverted my ref-based change.
- **Font stub:** its class name looked like a Tailwind `font-*` utility, which `cn` merged away. The stub now uses Next-like `__variable_*` names.

## Follow-ups

- PR #1 is a draft: review it, mark it ready and merge when satisfied.
- **Done 2026-10-17, branch protection on `main`:**
  - Protection isn't available for private repos on GitHub Free (403), so the user had the repository made public.
  - The five jobs are required checks, limited to GitHub Actions (app 15368), with the branch kept up to date (strict). PRs are required (0 approvals), admins aren't exempt, and force-pushes and deletion are blocked.
  - Verified with throwaway PR #2: a deliberately failing unit test left the other four jobs green, the PR was `BLOCKED` and `gh pr merge` was refused. PR #2 was then closed and its branch deleted.
  - My first probe was wrong: it branched from `main`, which has no workflow, so no checks would have run. I rebased it onto `feat/ci-and-coverage`.

## Lessons added

- `2026-10-17-agent-browser-rendered-text`
