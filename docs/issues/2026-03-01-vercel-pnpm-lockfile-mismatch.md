# Vercel Deployment Failure: `ERR_PNPM_OUTDATED_LOCKFILE`

**Date:** 2026-03-01  
**Commit:** `58d32b9` (Branch: `main`)  
**Build Region:** Portland, USA (West) – pdx1  
**Severity:** 🔴 Build-blocking (P1)

---

## 1. Bug Summary

Vercel deployment fails during `pnpm install` because `pnpm-lock.yaml` is out of sync with `package.json`. The `zod@^4.3.6` dependency was added to `package.json` but the pnpm lockfile was never regenerated.

**Error:**
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with <ROOT>/package.json

Failure reason:
specifiers in the lockfile don't match specifiers in package.json:
* 1 dependencies were added: zod@^4.3.6
```

---

## 2. Root Cause Analysis

### Direct Cause

Commit [`3729566`](https://github.com/tienphatnguyendev/active-recall-generator/commit/3729566) (`feat(SOLO-132): implement frontend security fixes`) added `zod@^4.3.6` to `package.json` and updated `package-lock.json` — but **did not** update `pnpm-lock.yaml`.

### Why It Broke CI

Vercel detected `pnpm-lock.yaml` and auto-selected pnpm as the package manager. In CI environments, pnpm defaults to `--frozen-lockfile`, which **strictly refuses** to install if the lockfile doesn't match `package.json`. Since `zod` was missing from the lockfile, the install fails immediately.

### Deeper Issue: Dual Lockfiles

The repo contains **both** `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm). This signals an inconsistent package manager strategy:

| File | Last Updated | Package Manager |
|---|---|---|
| `pnpm-lock.yaml` | `203a436` (earlier commit) | pnpm |
| `package-lock.json` | `3729566` (SOLO-132 commit) | npm |

The developer who added `zod` likely ran `npm install` locally (which updated `package-lock.json`) instead of `pnpm install` (which would have updated `pnpm-lock.yaml`). Since Vercel uses pnpm (based on `pnpm-lock.yaml` detection), the stale lockfile caused the failure.

---

## 3. Immediate Fix

### Option A: Regenerate the pnpm lockfile (Recommended)

```bash
# From the project root
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: regenerate pnpm-lock.yaml to include zod dependency"
git push origin main
```

This regenerates `pnpm-lock.yaml` to match the current `package.json`, resolving the CI error.

### Option B: Override frozen-lockfile on Vercel

In project settings → Build & Development → Install Command:
```
pnpm install --no-frozen-lockfile
```

> ⚠️ **Not recommended.** This masks the symptom without fixing the root cause. It also weakens the reproducibility guarantees that lockfiles provide.

---

## 4. Long-Term Preventative Measures

### 4.1 Standardize on One Package Manager

Remove the npm lockfile and commit to pnpm exclusively:

```bash
# Remove the npm lockfile
rm package-lock.json
echo "package-lock.json" >> .gitignore

# Optionally pin the package manager in package.json
# (add to package.json)
#   "packageManager": "pnpm@10.x"
```

Add a `preinstall` script to prevent accidental use of npm/yarn:

```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

### 4.2 Add a CI Pre-check

Add a GitHub Action that validates lockfile consistency on every PR:

```yaml
# .github/workflows/lockfile-check.yml
name: Lockfile Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
```

This catches stale lockfiles **before** they reach `main` and break deployments.

### 4.3 Use Corepack (Optional)

Pin the exact pnpm version via Corepack to ensure all contributors use the same version:

```bash
corepack enable
corepack use pnpm@10.x
```

This adds a `"packageManager"` field to `package.json`, which Vercel respects.

### 4.4 Contributor Documentation

Add to `CONTRIBUTING.md` or the project README:

```markdown
## Package Manager

This project uses **pnpm**. Do not use `npm` or `yarn`.

- Install dependencies: `pnpm install`
- Add a dependency: `pnpm add <package>`
- Always commit both `package.json` and `pnpm-lock.yaml`
```

---

## 5. Resolution Checklist

- [ ] Run `pnpm install` to regenerate `pnpm-lock.yaml`
- [ ] Delete `package-lock.json` from the repo
- [ ] Add `package-lock.json` to `.gitignore`
- [ ] Add `"preinstall": "npx only-allow pnpm"` to `package.json`
- [ ] Add `"packageManager"` field to `package.json`
- [ ] Add lockfile-check GitHub Action
- [ ] Update contributor documentation
- [ ] Verify Vercel deployment succeeds
