# Implementation Plan: C4 — No Server-Side Input Validation in Auth Actions

## Issue Summary

The `login` and `register` server actions in `app/actions/auth.ts` pass raw `FormData` values to Supabase without any validation. Missing fields, invalid email formats, or short passwords are sent directly to the auth API. This creates inconsistent error messages, potential abuse vectors, and a mismatch between frontend hints ("8 characters") and the Supabase config (minimum 6).

## Technical Approach

Add a lightweight validation layer using Zod schemas inside the server actions. Validate all inputs before calling Supabase. Align frontend and backend password requirements to 8 characters minimum.

## Implementation Steps

### Step 1: Install Zod (2 min)

**Dependencies**: None

```bash
pnpm add zod
```

### Step 2: Create validation schemas (10 min)

**Dependencies**: Step 1

Create `app/actions/validation.ts`:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
});
```

### Step 3: Update `app/actions/auth.ts` (15 min)

**Dependencies**: Step 2

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginSchema, registerSchema } from "./validation";

export async function login(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}

export async function register(formData: FormData) {
  const result = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: { data: { name: result.data.name } },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}
```

### Step 4: Update Supabase config to match (5 min)

**Dependencies**: None

In `supabase/config.toml`, update:

```diff
-minimum_password_length = 6
+minimum_password_length = 8
```

### Step 5: Test validation (15 min)

**Dependencies**: Steps 1–4

1. Submit login form with empty fields → expect "Email is required"
2. Submit login form with invalid email → expect "Please enter a valid email"
3. Submit register form with 5-char password → expect "Password must be at least 8 characters"
4. Submit register form with valid data → expect successful registration
5. Verify `pnpm build` has no type errors

## Acceptance Criteria

- [ ] All auth form submissions are validated before Supabase calls
- [ ] Invalid inputs return clear, user-friendly error messages
- [ ] Password minimum is consistently 8 characters (frontend, backend, Supabase config)
- [ ] Zod schemas are defined in a shared validation file
- [ ] No `as string` casts remain in auth actions

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Zod adds bundle size | Low | Zod is tree-shakeable; server actions run server-side only |
| Error message format change | Low | Test both login and register flows manually |

**Rollback**: Remove Zod dependency, revert `auth.ts` to original.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~47 minutes
- **Dependencies**: Zod package
