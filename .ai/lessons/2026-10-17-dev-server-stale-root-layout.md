# Dev server keeps a stale root layout after replacing root files

- **Date:** 2026-10-17
- **Area:** `packages/app` dev server (pm2 `workspace-preview`)
- **Trigger:** surprising failure

## Context

`app/layout.tsx` was rewritten, and `app/globals.css` and `app/page.tsx` were deleted or moved into route groups. The running `next dev` returned 200 with the new page body, but still had the old `<title>` ("Next.js starter") and no root-layout fonts or classes.

## Finding

HMR didn't fully pick up the replaced root layout and the deleted CSS. A curl check of the body text alone missed it; checking the title and computed styles caught it.

## Resolution / Improvement

`pm2 stop workspace-preview && rm -rf packages/app/.next && pm2 start workspace-preview`.

## Rule of thumb

After moving or deleting root-level `app/` files, restart the dev server with a clean `.next` before trusting what it serves.
