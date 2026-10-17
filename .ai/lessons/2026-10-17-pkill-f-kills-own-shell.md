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

**Follow-up (same day):** working directory isn't enough to identify a test server. Both the pm2 dev server and a `next start` test server run `next-server` from `packages/app`, and a cwd-based filter killed the dev server (pm2 restarted it). Identify the test server by its parent's command line instead: `for p in $(pgrep -f next-server); do pp=$(ps -o ppid= -p $p | tr -d ' '); tr '\0' ' ' < /proc/$pp/cmdline | grep -q -- "--port 3101" && echo $p; done`. Then kill its process group.

## Rule of thumb

Never `pkill -f` a pattern that appears in your own command. Kill by a PID verified through the parent command line (the port flag), not through cwd.
