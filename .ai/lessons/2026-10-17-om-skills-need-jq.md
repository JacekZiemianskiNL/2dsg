# The om-* agent skills need `jq`, which the sandbox lacks

- **Date:** 2026-10-17
- **Area:** `.ai/agentic.config.json`, open-mercato `om-*` skills
- **Trigger:** discovery (running `om-setup-agent-pipeline`)

## Context
Every `om-*` skill loads `.ai/agentic.config.json` with a shell snippet built on `jq -r '.field // default'`, and the GitHub tracker descriptor uses `jq` in places.

## Finding
`jq` is not installed in this sandbox (`which jq` finds nothing), and it is not an npm dependency. Without it, the snippet silently gets empty values or fails.

## Resolution / Improvement
Read config values with Node instead, which is always present:
`node -p 'require("./.ai/agentic.config.json").validation.commands.join("\n")'`.
`gh ... --jq` still works, because the `gh` CLI embeds its own jq engine.

## Rule of thumb
In this sandbox, replace standalone `jq` calls in skill snippets with `node -p` or `gh --jq`; don't install a system package just for that.
