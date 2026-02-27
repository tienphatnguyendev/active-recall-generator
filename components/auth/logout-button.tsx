"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50",
        className
      )}
      aria-label="Sign out"
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 2H2.5C2.22 2 2 2.22 2 2.5v9c0 .28.22.5.5.5H5M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
