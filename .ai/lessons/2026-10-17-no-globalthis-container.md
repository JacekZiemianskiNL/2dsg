# Don't cache the DI container on globalThis

- **Date:** 2026-10-17
- **Area:** `packages/core/src/container/container.ts`, Next.js bundling
- **Trigger:** bug fix

## Context

The Awilix container was cached on `globalThis`, like the ORM. After `HealthService` changed (`isDatabaseAvailable()` became `check()`), the dev server returned 500 on `/api/health` and `/admin`. In production, `/admin` returned 500 when the database was down, even though it caught `ServiceUnavailableError`.

## Finding

- **Dev:** HMR re-evaluates modules, but the cached container kept instances of the old `HealthService` class.
- **Production:** Next bundles workspace packages separately for route handlers and server-rendered pages. A container built by one bundle handed the page a service from the other bundle, so the error it threw was a different `ServiceUnavailableError` class and `instanceof` failed.

## Resolution / Improvement

Cache the container per module instance (`let containerPromise`). Only the connection pool (`getOrm`) stays on `globalThis`. Connections stayed at 1 across HMR reloads afterwards.

## Rule of thumb

Put only process-wide external resources (pools, sockets) on `globalThis`, never objects whose classes come from bundled code.
