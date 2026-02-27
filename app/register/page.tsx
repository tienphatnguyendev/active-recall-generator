"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register(name, email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <span className="inline-block h-6 w-1 bg-primary" aria-hidden="true" />
          <span className="text-sm font-bold uppercase tracking-widest text-foreground">
            Active Recall
          </span>
        </div>

        <div className="border border-border bg-card p-8">
          <div className="mb-6 border-l-4 border-primary pl-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Create account
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill in your details to get started.
            </p>
          </div>

          {error && (
            <div className="mb-5 border-l-2 border-destructive bg-destructive/5 px-3 py-2.5">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                disabled={isLoading}
                className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={isLoading}
                suppressHydrationWarning
                className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name || !email || !password}
              className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isLoading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
              )}
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
