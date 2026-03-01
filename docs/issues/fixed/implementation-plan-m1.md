# Implementation Plan: M1 — `egg-info` Directory Committed

## Issue Summary

The build artifact directory `src/note_taker.egg-info/` is committed to the repository. Build artifacts should be gitignored to prevent noise in diffs and to keep the repo clean.

## Technical Approach

Add the `egg-info` pattern to `.gitignore` and remove the committed directory from git tracking.

## Implementation Steps

### Step 1: Add to `.gitignore` (2 min)

Append to `.gitignore`:

```
# Build artifacts
*.egg-info/
```

### Step 2: Remove from git tracking (2 min)

```bash
git rm -r --cached src/note_taker.egg-info/
git commit -m "chore: remove egg-info from tracking, add to .gitignore"
```

## Acceptance Criteria

- [ ] `src/note_taker.egg-info/` no longer tracked by git
- [ ] `.gitignore` includes `*.egg-info/`

## Risk Assessment

None — purely a cleanup operation.

## Resources Required

- **Team**: 1 developer
- **Time**: ~5 minutes
