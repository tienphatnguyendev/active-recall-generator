# Implementation Plan: M3 — AuthContext Is Static — No Real-Time Session Sync

## Issue Summary

The `AuthProvider` component receives the user object from the server layout render but never subscribes to Supabase's `onAuthStateChange`. If a session expires mid-use, the UI continues displaying the user as authenticated until a full page reload occurs.

## Technical Approach

Add an `onAuthStateChange` listener inside the `AuthProvider` to update the user context and trigger a router refresh when auth state changes (sign-out, token refresh, etc.).

## Implementation Steps

### Step 1: Update `AuthProvider` (15 min)

Update `components/auth/auth-context.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null }>({ user: null });

export function AuthProvider({
  children,
  user: initialUser,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (event === 'SIGNED_OUT') {
          router.refresh();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Step 2: Test (10 min)

1. Log in → verify user context available
2. Open DevTools → delete Supabase auth cookies → verify UI updates
3. Open two tabs → log out in one → verify the other tab updates

## Acceptance Criteria

- [ ] `AuthProvider` subscribes to `onAuthStateChange`
- [ ] Sign-out in one tab reflects in other tabs
- [ ] Session expiry triggers UI refresh

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Excessive re-renders | Low | Only update state when user actually changes |

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~25 minutes
