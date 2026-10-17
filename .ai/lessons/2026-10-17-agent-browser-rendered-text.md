# agent-browser matches rendered text, not source text

- **Date:** 2026-10-17
- **Area:** `test/integration` (agent-browser)
- **Trigger:** surprising failure

## Context

`agent-browser wait --text "Coming soon"` timed out on `/`, although the JSX contains "Coming soon".

## Finding

agent-browser matches the browser's rendered text (`innerText`), which applies CSS. The badge has Tailwind's `uppercase` class, so it renders as "COMING SOON".

## Resolution / Improvement

Assert on rendered text: "COMING SOON", plus the untransformed tagline. In the sandbox, run the suite with `INTEGRATION_DATABASE_URL="$DATABASE_URL"` (no Docker), and set `AGENT_BROWSER_EXECUTABLE_PATH`/`LD_LIBRARY_PATH` to a Chromium built as in `2026-10-17-headless-chromium-without-root`.

## Rule of thumb

In browser tests, assert what a user sees. Text transformed by CSS (`uppercase`, `capitalize`) must be matched in its rendered form.
