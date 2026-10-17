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
- [2026-10-17] [`node --env-file --run` doesn't pass the file's variables to the npm script](lessons/2026-10-17-node-env-file-run.md): spawn through a `process.loadEnvFile()` wrapper instead
- [2026-10-17] [The om-* agent skills need `jq`, which the sandbox lacks](lessons/2026-10-17-om-skills-need-jq.md): read `.ai/agentic.config.json` with `node -p` or `gh --jq` instead
- [2026-10-17] [agent-browser matches rendered text, not source text](lessons/2026-10-17-agent-browser-rendered-text.md): CSS `uppercase` changes what `wait --text` sees; local run recipe
- [2026-10-17] [Don't cache the DI container on globalThis](lessons/2026-10-17-no-globalthis-container.md): bundles and HMR produce different class identities; only the pool goes on globalThis
- [2026-10-17] [shadcn CLI in an existing npm-workspaces monorepo](lessons/2026-10-17-shadcn-cli-in-existing-monorepo.md): only `shadcn add` from packages/app; never `init`; check and install component deps
- [2026-10-17] [Dev server keeps a stale root layout after replacing root files](lessons/2026-10-17-dev-server-stale-root-layout.md): restart with a clean .next after moving or deleting root app/ files
- [2026-10-17] [Running headless Chromium in the sandbox without root](lessons/2026-10-17-headless-chromium-without-root.md): apt-get download + dpkg-deb -x + LD_LIBRARY_PATH
- [2026-10-17] [`pkill -f <pattern>` can kill the agent's own shell](lessons/2026-10-17-pkill-f-kills-own-shell.md): kill by verified PID instead
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
