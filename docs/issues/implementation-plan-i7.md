# Implementation Plan: I7 — Mock Analytics Data Still Shipped in Production Bundle

## Issue Summary

`lib/mock-analytics-data.ts` (450 lines, 12KB) contains hardcoded mock analytics data. Although it's no longer actively imported by the analytics page, it remains in the production source tree and could be accidentally re-imported.

## Technical Approach

Move the mock data file to a test-only location where it won't be included in the production bundle. Update any remaining test imports.

## Implementation Steps

### Step 1: Check for active imports (5 min)

```bash
grep -r "mock-analytics-data" --include="*.ts" --include="*.tsx" app/ components/ lib/
```

### Step 2: Move file (5 min)

```bash
mkdir -p tests/__mocks__
mv lib/mock-analytics-data.ts tests/__mocks__/mock-analytics-data.ts
```

### Step 3: Also move `lib/analytics-test-scenarios.ts` (2 min)

```bash
mv lib/analytics-test-scenarios.ts tests/__mocks__/analytics-test-scenarios.ts
```

### Step 4: Update any remaining imports (5 min)

If any test files reference the old path, update them.

### Step 5: Verify (3 min)

```bash
pnpm build  # Ensure no broken imports
```

## Acceptance Criteria

- [ ] No mock data files in `lib/`
- [ ] Mock files relocated to `tests/__mocks__/`
- [ ] `pnpm build` succeeds
- [ ] No test files have broken imports

## Risk Assessment

Negligible risk. File move only.

## Resources Required

- **Team**: 1 developer
- **Time**: ~20 minutes
