<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project workflow: the `.ai/` directory

All AI agents (Claude Code, Codex, Cursor, etc.) working in this repo MUST follow this workflow. `.ai/` is the project's metadata and long-term memory.

```
.ai/
├── specs/               # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md   # active specs
│   ├── implemented/         # specs that are fully implemented
│   └── archive/             # superseded / abandoned specs
├── runs/                # Logs of autonomous AI runs: YYYY-MM-DD-slug.md
├── lessons.md           # Index of lessons learned (long-term LLM memory)
└── lessons/             # Detailed lessons: YYYY-MM-DD-slug.md
```

`.ai/cezar/` is tooling-managed; do not modify it.

## Naming

All files in `specs/`, `runs/` and `lessons/` are named `YYYY-MM-DD-slug.md`: the creation date (use today's date) plus a lowercase kebab-case slug (e.g. `2026-10-17-user-auth.md`). Never invent other schemes.

## Rules

1. **Start of a task:** read `.ai/lessons.md`. If the task relates to a spec in `.ai/specs/`, read it first.
2. **Spec first (SDD):** for any non-trivial feature or behavior change, a spec must exist in `.ai/specs/`. If none exists, write one (or ask the user) before implementing. Implement what the spec says; if reality forces a deviation, update the spec in the same change.
3. **Spec lifecycle:** when a spec is fully implemented, move it to `.ai/specs/implemented/` (keep its filename). When it is superseded or abandoned, move it to `.ai/specs/archive/`. Use `git mv`.
4. **Runs:** every autonomous run MUST create a log at `.ai/runs/YYYY-MM-DD-slug.md` recording: goal, related spec, actions taken, files changed, verification performed and results, outcome (done/partial/blocked), and follow-ups. Update it as the run progresses and finalize it before finishing.
5. **Lessons:** after fixing a bug, hitting a surprising failure, receiving a correction, or discovering a non-obvious fact about the codebase or tooling, record it: create `.ai/lessons/YYYY-MM-DD-slug.md` and add a one-line entry (newest first) to `.ai/lessons.md`. Update or remove existing lessons that are wrong. Don't record what the code or git history already makes obvious. A user correction is always recorded, in the same session, before moving on; if the same mistake recurs, promote the lesson to a rule in this file.
6. **Never** put secrets, tokens or credentials in specs, runs or lessons.

## Working principles

Adapted from Boris Cherny's Claude Code tips.

- **Plan before building.** For multi-step or multi-file work, plan first (plan mode if available) and refine the plan until the implementation is straightforward; the plan belongs in the spec. If the work goes sideways, stop and re-plan rather than patching forward.
- **Prove it works.** A change is done only when verified: run `npm run lint` and `npm run build` (plus tests, once they exist), and exercise UI or behavior changes in the running app. Report failures as they are; never claim success without running the checks.
- **Own bug fixes.** Given a bug report, error log or failing check, reproduce it, find the root cause and fix it without step-by-step guidance. If a fix feels hacky, scrap it and implement the clean solution.
- **Use subagents** for broad codebase searches and independent parallel work, to keep the main context focused.
