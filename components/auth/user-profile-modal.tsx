"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "./auth-context";
import { cn } from "@/lib/utils";

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  
  // NOTE: In a real implementation we would fetch these preferences from user metadata
  // or a user_profiles table. For now we use the raw Supabase user and dummy state.
  const userMetadata = user?.user_metadata || {};

  const [name, setName] = useState(userMetadata.name ?? "");
  const [bio, setBio] = useState(userMetadata.bio ?? "");
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    userMetadata.preferences?.theme ?? "system"
  );
  const [sessionLength, setSessionLength] = useState(
    userMetadata.preferences?.sessionLength ?? 20
  );
  const [notifications, setNotifications] = useState(
    userMetadata.preferences?.notifications ?? true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      setName(meta.name ?? "");
      setBio(meta.bio ?? "");
      setTheme(meta.preferences?.theme ?? "system");
      setSessionLength(meta.preferences?.sessionLength ?? 20);
      setNotifications(meta.preferences?.notifications ?? true);
    }
  }, [user]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      // TODO: Implement updateProfile Server Action
      // await updateProfile({
      //   name,
      //   bio,
      //   preferences: { theme, sessionLength, notifications },
      // });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="User profile settings"
    >
      <div className="w-full max-w-md border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-5 w-0.5 bg-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Profile & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-border">
          {/* Identity */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</p>
            <div>
              <label htmlFor="profile-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
                className="w-full border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email <span className="text-muted-foreground/60">(read only)</span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-muted-foreground opacity-70"
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Bio
              </label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                disabled={isSaving}
                placeholder="A short description..."
                className="w-full resize-none border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preferences</p>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      "flex-1 border py-1.5 text-xs font-medium capitalize transition-colors",
                      theme === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-secondary hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="session-length" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Default session length:{" "}
                <span className="text-foreground">{sessionLength} cards</span>
              </label>
              <input
                id="session-length"
                type="range"
                min={5}
                max={100}
                step={5}
                value={sessionLength}
                onChange={(e) => setSessionLength(Number(e.target.value))}
                disabled={isSaving}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground/60">
                <span>5</span>
                <span>100</span>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Study reminders</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifications}
                onClick={() => setNotifications((v) => !v)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                  notifications ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform",
                    notifications ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
                <span className="sr-only">{notifications ? "Disable" : "Enable"} study reminders</span>
              </button>
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {saved && <p className="text-xs text-primary">Saved successfully.</p>}
            {!error && !saved && <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isSaving && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
                )}
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
