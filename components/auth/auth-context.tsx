"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  user: initialUser,
}: {
  children: ReactNode;
  user: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore initial empty session if server provided user
      if (event === "INITIAL_SESSION" && initialUser && !session) {
        return;
      }

      setUser((prevUser) => {
        if (prevUser?.id !== session?.user?.id) {
          return session?.user ?? null;
        }
        return prevUser;
      });
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
