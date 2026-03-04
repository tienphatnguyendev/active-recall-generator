"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { setAccessToken } from "@/lib/api-client";


interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  user: initialUser,
  accessToken: initialAccessToken,
}: {
  children: ReactNode;
  user: User | null;
  accessToken: string | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  // Eagerly set the access token on the client-side module instance
  // This guarantees that any API calls made before `useEffect` fires have the token
  if (typeof window !== "undefined" && initialAccessToken) {
    setAccessToken(initialAccessToken);
  }

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Eagerly fetch session on mount to ensure we have the absolute latest client session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
      if (session?.user) {
        setUser((prev) => prev?.id !== session.user.id ? session.user : prev);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore empty sessions on initialization if the server already provided a valid user
      // This defends against HttpOnly cookie mismatches causing the client to think it's signed out
      // We explicitly allow SIGNED_OUT to proceed to clear the state
      if (!session && initialUser && event === "INITIAL_SESSION") {
        return;
      }

      setUser((prevUser) => {
        if (prevUser?.id !== session?.user?.id) {
          return session?.user ?? null;
        }
        return prevUser;
      });
      
      setAccessToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
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
