# `pkill -f <pattern>` can kill the agent's own shell

- **Date:** 2026-10-17
- **Area:** agent tooling, process management
- **Trigger:** surprising failure

## Context

`pkill -f "next start --port 3100"` was run in the same Bash command line that had started that server. The command exited with code 144 and the server kept running as an orphan.

## Finding

`pkill -f` matches the full command line of every process, including the `bash -c '…'` running the command, because the pattern appears in it. The shell killed itself, not just the target.

## Resolution / Improvement

Find the target PID first (`pgrep -af next-server`, then check `readlink /proc/<pid>/cwd` and the parent PID), and `kill <pid>`. Leave the pm2-managed preview server (parent `next dev` in `packages/app`) alone.

## Rule of thumb

Never `pkill -f` a pattern that appears in your own command; kill by verified PID.
