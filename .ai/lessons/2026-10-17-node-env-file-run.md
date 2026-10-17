# `node --env-file --run` doesn't pass the file's variables to the npm script

- **Date:** 2026-10-17
- **Area:** root `package.json` scripts, env loading
- **Trigger:** discovery (spec for issue #5)

## Context
The plan was to load a root `.env` for npm scripts with `node --env-file-if-exists=.env --run <script>`.

## Finding
On Node 24.21, the script started by `--run` doesn't see the variables from the env file. `--env-file*` also isn't allowed in `NODE_OPTIONS`. A plain child spawned by a process started with `--env-file` (or after `process.loadEnvFile()`) does inherit them, and a variable already set in the shell takes precedence in both cases.

## Resolution / Improvement
Use a small wrapper that calls `process.loadEnvFile()` and spawns the real command (see `.ai/specs/implemented/2026-10-17-npm-run-setup-installer.md`).

## Rule of thumb
To load a `.env` for npm scripts, spawn the command from a process that loaded the file. Don't use `node --env-file --run`.
