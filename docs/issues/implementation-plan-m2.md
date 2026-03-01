# Implementation Plan: M2 — `updated_at` Column Never Auto-Updated

## Issue Summary

The `updated_at` columns on `artifacts` and `cards` use `DEFAULT now()` for creation time but have no trigger to update the value when rows are modified. After creation, `updated_at` is always stale.

## Technical Approach

Create a reusable trigger function and apply it to all tables with `updated_at` columns.

## Implementation Steps

### Step 1: Create migration (10 min)

Create `supabase/migrations/20260301000003_updated_at_trigger.sql`:

```sql
-- Reusable trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to artifacts
CREATE TRIGGER set_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Apply to cards
CREATE TRIGGER set_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### Step 2: Apply and verify (5 min)

```bash
supabase db reset
# Update an artifact via the UI
# Check that updated_at changed
```

## Acceptance Criteria

- [ ] `updated_at` auto-updates on `UPDATE` for `artifacts` and `cards`
- [ ] Migration applies cleanly

## Risk Assessment

None — purely additive change.

## Resources Required

- **Team**: 1 developer
- **Time**: ~15 minutes
