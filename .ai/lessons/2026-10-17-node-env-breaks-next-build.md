# NODE_ENV=development breaks `next build`

- **Date:** 2026-10-17
- **Area:** `packages/app` build, sandbox environment
- **Trigger:** bug fix

## Context

`npm run build` failed while prerendering `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')`, plus a burst of "Each child in a list should have a unique key" warnings.

## Finding

The sandbox shell exports `NODE_ENV=development`, and `next build` respects an existing NODE_ENV. Rendering production output with development React fails this way. It looks like a duplicate-React problem, but `npm ls react` showed a single copy. The original single-app repo (Next 16.3.4) failed the same way, so the migration didn't cause it.

## Resolution / Improvement

`packages/app` scripts now run `NODE_ENV=production next build` and `NODE_ENV=production next start`.

## Rule of thumb

If `next build` fails with `useContext` of null, check `echo $NODE_ENV` before hunting for duplicate React copies.
