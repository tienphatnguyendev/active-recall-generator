# Supabase Auth Integration Implementation Plan (SOLO-97)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate real authentication into the Next.js frontend using `@supabase/ssr` with a Server-Component Driven approach.

**Architecture:** Use Supabase's standard SSR pattern. The server fetches the session in `app/layout.tsx` and passes it to a lightweight client-side `AuthContext`. Route protection is handled by `middleware.ts`. Auth operations (login/register/logout) are transitioned to Next.js Server Actions.

**Tech Stack:** Next.js App Router, `@supabase/ssr`, `@supabase/supabase-js`, React Server Actions, Middleware.

---

### Task 1: Install Dependencies & Setup Env

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

**Step 1: Install Supabase packages**

Run: `npm install @supabase/supabase-js @supabase/ssr`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install supabase ssr and client libraries"
```

---

### Task 2: Create Supabase Utility Clients

**Files:**
- Create: `utils/supabase/client.ts`
- Create: `utils/supabase/server.ts`
- Create: `utils/supabase/middleware.ts`

**Step 1: Create Client Utility**
Create `utils/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create Server Utility**
Create `utils/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Step 3: Create Middleware Utility**
Create `utils/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/register') ||
                      request.nextUrl.pathname.startsWith('/forgot-password') ||
                      request.nextUrl.pathname.startsWith('/reset-password');

  // Protect study/artifacts/analytics routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/register') &&
    request.nextUrl.pathname !== '/'
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged in users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/artifacts'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 4: Commit**
```bash
git add utils/supabase/
git commit -m "feat: add supabase ssr client utilities"
```

---

### Task 3: Implement Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create Middleware**
Create `middleware.ts` at the root (next to `app/`):
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Commit**
```bash
git add middleware.ts
git commit -m "feat: implement nextjs middleware for route protection"
```

---

### Task 4: Refactor AuthContext & RootLayout

**Files:**
- Modify: `components/auth/auth-context.tsx`
- Modify: `app/layout.tsx`

**Step 1: Simplify AuthContext**
Rewrite `components/auth/auth-context.tsx`:
```typescript
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ 
  children, 
  user 
}: { 
  children: ReactNode; 
  user: User | null;
}) {
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: false, // Server component handles initial load
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

**Step 2: Update RootLayout**
Update `app/layout.tsx` to pass the user down:
```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-context";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

// ... keep fonts and metadata ...

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <AuthProvider user={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**
```bash
git add components/auth/auth-context.tsx app/layout.tsx
git commit -m "refactor: simplify AuthContext and fetch session in RootLayout"
```

---

### Task 5: Create Server Actions for Auth

**Files:**
- Create: `app/actions/auth.ts`

**Step 1: Implement Actions**
Create `app/actions/auth.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}

export async function register(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/artifacts");
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
```

**Step 2: Commit**
```bash
git add app/actions/auth.ts
git commit -m "feat: add server actions for authentication"
```

---

### Task 6: Update UI Components to use Actions

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `components/auth/logout-button.tsx`
- Modify: `components/auth/user-profile-modal.tsx` (remove updateProfile call for now, handle in separate issue if needed)

**Step 1: Update Login Page**
Update `app/login/page.tsx` to use the `login` server action instead of `useAuth().login`.

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { BrainCircuit, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    // ... keep existing UI structure ...
    <form action={handleSubmit} className="space-y-4">
      {/* ... inputs ... */}
      {error && <div className="text-sm text-destructive">{error}</div>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  )
}
```

**Step 2: Update Register Page**
Update `app/register/page.tsx` to use the `register` server action. Follow a similar pattern to the login page (use `action={handleSubmit}` with `useTransition`).

**Step 3: Update Logout Button**
Update `components/auth/logout-button.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isPending}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  );
}
```

**Step 4: Update User Profile Modal**
Remove the `updateProfile` usage from `components/auth/user-profile-modal.tsx` as it's no longer in `AuthContext` (we can add a Server Action for this later if needed).

**Step 5: Commit**
```bash
git add app/login/page.tsx app/register/page.tsx components/auth/logout-button.tsx components/auth/user-profile-modal.tsx
git commit -m "refactor: update UI components to use auth server actions"
```

---

### Task 7: Cleanup

**Files:**
- Delete: `app/api/auth` directory

**Step 1: Delete mock API routes**
Run: `rm -rf app/api/auth`

**Step 2: Commit**
```bash
git rm -r app/api/auth
git commit -m "chore: remove mock auth api routes"
```
