# `git mv` of directories fails with EXDEV on overlayfs

- **Date:** 2026-10-17
- **Area:** sandbox filesystem, git
- **Trigger:** discovery

## Context

`git mv src packages/app/src` failed with `fatal: renaming 'src' failed: Invalid cross-device link`, even though source and target are on the same mount.

## Finding

The workspace is an overlayfs. Renaming a directory that comes from the base image layer returns `EXDEV`. Renaming files works.

## Resolution / Improvement

Copy the directory (`cp -a`), delete the original, then `git add -A` both paths. Git still detects the moves as renames.

## Rule of thumb

On EXDEV from a directory rename, copy and delete instead of retrying `git mv`.
