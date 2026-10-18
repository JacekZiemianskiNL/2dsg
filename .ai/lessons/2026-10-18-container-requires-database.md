# The DI container can't be built without the database

- **Date:** 2026-10-18
- **Area:** `packages/core/src/container/container.ts`
- **Trigger:** review finding (spec `2026-10-18-mentor-onboarding-and-platform-primitives.md`)

## Context
The spec first had the auth guards resolve `sessionService` from the "root container", on the assumption that singletons can be resolved without any request state.

## Finding
`buildContainer()` calls `loadConfig()`, which needs `DATABASE_URL`, and then `await getOrm()`, which connects, before it registers anything. Anything resolved through `getContainer()` therefore fails when the database is unreachable. A security check built on it would fail with whatever error it maps to, such as a 401, which turns an outage into a sign-in loop.

## Resolution / Improvement
Code that has to work without the database (session verification, health-adjacent checks) gets its own module-cached factory (e.g. `getSessionService()`) built from lazily loaded config. The container registers the same instance for code that does use DI.

## Rule of thumb
Before putting something on a path that must survive a database outage, check that it doesn't go through `getContainer()`.
