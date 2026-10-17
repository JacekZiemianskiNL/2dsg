# Running headless Chromium in the sandbox without root

- **Date:** 2026-10-17
- **Area:** visual verification tooling
- **Trigger:** discovery

## Context

The sandbox (Debian 12) has no browser. Playwright's Chromium fails with `libnspr4.so: cannot open shared object file`, and there's no root access for `apt-get install`.

## Finding

`apt-get` works without root when its state and cache are redirected to a writable directory, and `.deb` files can be extracted with `dpkg-deb -x`.

## Resolution / Improvement

Work under `$CLAUDE_JOB_DIR/tmp/pw`:

1. `npm i playwright`, then `PLAYWRIGHT_BROWSERS_PATH=$PWD/browsers npx playwright install chromium-headless-shell`.
2. `A="-o Dir::State::Lists=$PWD/apt/lists -o Dir::Cache=$PWD/apt/cache -o Dir::State::status=/var/lib/dpkg/status -o Debug::NoLocking=1"`, then run `apt-get $A update` and `apt-get $A download libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdbus-1-3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 libasound2 libatspi2.0-0 libwayland-server0 libdrm2 libxi6 libxtst6 libxshmfence1`.
3. `dpkg-deb -x` each `.deb` into `root/`, then set `LD_LIBRARY_PATH` to every directory under `root/` that contains `.so` files.
4. `ldd <chrome-headless-shell> | grep "not found"` should print nothing.

## Rule of thumb

For UI changes, take real screenshots this way rather than relying on curl alone.
