# shadcn CLI in an existing npm-workspaces monorepo

- **Date:** 2026-10-17
- **Area:** `packages/ui`, `packages/app`, shadcn CLI 4.x
- **Trigger:** discovery

## Context

The goal was to set up shadcn/ui in an existing monorepo, not one scaffolded with `shadcn init --monorepo`, which creates a new Turborepo project.

## Finding

- **`add` works with two configs:** with a `components.json` in both `packages/app` and `packages/ui`, `shadcn add <c>` run from `packages/app` writes components to `packages/ui/src/components/`. But in this setup it neither installed the component dependencies nor wrote the theme CSS, even though it reported "Updated globals.css".
- **`init` breaks the setup:** `shadcn init` in `packages/app` tries to overwrite the monorepo `components.json`. Preset names changed: `base-nova` isn't valid for `-p`; use `-b base -p nova`.
- **New `cn` package:** generated components import `cn` from the npm package `cn` (shadcn's replacement for clsx + tailwind-merge), not from the `utils` alias.

## Resolution / Improvement

Ran `shadcn init -b base -p nova` in a scratch Next app outside the repo, and copied its theme CSS and dependencies into `packages/ui`.

## Rule of thumb

In this repo only use `shadcn add` from `packages/app`. Check the component's imports and install any missing dependencies with `npm install <dep> -w @devmentor/ui`.
