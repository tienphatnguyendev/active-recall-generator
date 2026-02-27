"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, setAccessToken, setRefreshFn } from "@/lib/api-client";

interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  preferences?: {
    theme: "light" | "dark" | "system";
    sessionLength: number;
    notifications: boolean;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await api.post<{ accessToken: string }>("/api/auth/refresh");
      setAccessToken(res.accessToken);
      return res.accessToken;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  // Bootstrap: try to restore session via refresh token cookie
  useEffect(() => {
    setRefreshFn(refreshToken);

    const bootstrap = async () => {
      try {
        const res = await api.post<{ accessToken: string; user: User }>(
          "/api/auth/refresh"
        );
        setAccessToken(res.accessToken);
        setUser(res.user);
      } catch {
        // No active session
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [refreshToken]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>(
      "/api/auth/login",
      { email, password }
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>(
      "/api/auth/register",
      { name, email, password }
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await api.patch<User>("/api/auth/profile", data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
        updateProfile,
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
