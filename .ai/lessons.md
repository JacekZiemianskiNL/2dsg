# Lessons Learned

Long-term memory for LLM agents working in this repository. Read this file **before starting a task**; append to it **after fixing a bug, finishing a run, or discovering something worth remembering**.

## How to use

- Keep this file as a short **index**: one line per lesson, newest first.
- Put detail (context, root cause, fix, how to avoid) in `lessons/YYYY-MM-DD-slug.md`.
- Before adding a lesson, check whether one already exists; update it instead of duplicating.
- Delete or amend lessons that turn out to be wrong or outdated.

## Index

Format: `- [YYYY-MM-DD] [Title](lessons/YYYY-MM-DD-slug.md) — one-line takeaway`

<!-- Add new entries below this line, newest first -->
- [2026-10-17] [NODE_ENV=development breaks `next build`](lessons/2026-10-17-node-env-breaks-next-build.md): the sandbox sets NODE_ENV=development; app build/start scripts force production
- [2026-10-17] [`git mv` of directories fails with EXDEV on overlayfs](lessons/2026-10-17-overlayfs-git-mv-exdev.md): copy and delete instead; git still sees renames

## Lesson file template

```markdown
# <Title>

- **Date:** YYYY-MM-DD
- **Area:** <module / file / tool>
- **Trigger:** <bug fix | review finding | run | discovery>

## Context
What was happening.

## Finding
Root cause or insight.

## Resolution / Improvement
What was done, or what to do next time.

## Rule of thumb
One actionable sentence.
```
