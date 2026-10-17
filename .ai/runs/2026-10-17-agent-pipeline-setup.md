# Agent PR pipeline setup

- **Date:** 2026-10-17
- **Related spec:** none (process configuration through the `om-setup-agent-pipeline` skill; no product code changes)

## Goal

Configure the open-mercato `om-*` agent skills for this repository: write `.ai/agentic.config.json`, install the tracker and browser descriptors, create the label taxonomy, and generate the missing project docs.

## Actions taken

- Detected the repo shape: GitHub `JacekZiemianskiNL/2dsg` with default branch `main`, the npm lockfile, the `validate` script steps mirrored in `.github/workflows/ci.yml`, and `agent-browser` already used by the integration suite.
- Got the user's choices interactively:
  - Validation runs the split `validate` steps (lint, typecheck, test:coverage, build, audit); integration stays CI-only.
  - The full label taxonomy is installed, and the QA gate is on.
  - Tracker is `github`, browser is `agent-browser`, specs live in `.ai/specs`, and `reviewChecklist` is `.ai/docs/engineering-standards.md`.
  - All three missing docs are generated.
- Wrote `.ai/agentic.config.json` and installed `.ai/trackers/github.md` and `.ai/browsers/agent-browser.md` as shipped.
- Created 25 missing GitHub labels: 24 from the taxonomy plus `do-not-close`. The existing `bug` and `documentation` were left untouched.
- Generated `SDLC.md` from the skill template (labels and QA gate on, discovery off), plus `CODE_REVIEW.md` and `BACKWARD_COMPATIBILITY.md` derived from `AGENTS.md`, the engineering standards and the actual package exports, routes and env schemas.
- Added `.gitkeep` files for `.ai/analysis`, `.ai/scripts` and `.ai/qa`, and gitignored the per-run QA state.
- Ran the cross-skill coverage check: `SKILL_COVERAGE_OK`.
- Recorded the lesson that `jq` is missing in the sandbox.

## Files changed

`.ai/agentic.config.json`, `.ai/trackers/github.md`, `.ai/browsers/agent-browser.md`, `.ai/{analysis,scripts,qa}/.gitkeep`, `.gitignore`, `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `.ai/lessons.md`, `.ai/lessons/2026-10-17-om-skills-need-jq.md`, and this log.

## Verification

- The config parses as JSON.
- Coverage check: OK.
- Labels: listed via `gh api` after creation.
- `npm run lint`: clean. The rest of the gate isn't affected, since there are no source changes.

## Outcome

Done. Changes land through a PR, because `main` is protected.

## Follow-ups

- Optional: run `om-setup-discovery-pipeline` for the product layer, and `om-ux-setup` to extract the design contract that `SDLC.md` refers to.
