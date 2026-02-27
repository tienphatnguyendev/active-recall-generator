"use client";

import { useState, useEffect } from "react";

interface RateLimitBannerProps {
  /** Seconds to count down before auto-hiding. Default: 60 */
  cooldownSeconds?: number;
  onDismiss?: () => void;
}

export function RateLimitBanner({
  cooldownSeconds = 60,
  onDismiss,
}: RateLimitBannerProps) {
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onDismiss?.();
      return;
    }
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 border border-accent/50 bg-accent/10 px-4 py-3"
    >
      <svg
        className="mt-0.5 shrink-0 text-accent-foreground"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7.5 2L13.5 12H1.5L7.5 2Z"
          stroke="hsl(var(--accent))"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 6v3M7.5 11v.5"
          stroke="hsl(var(--accent))"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex-1">
        <p className="text-xs font-semibold text-foreground">Too many requests</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          You&apos;re sending requests too quickly. Please wait{" "}
          <span className="font-mono font-medium text-foreground">{remaining}s</span>{" "}
          before trying again.
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
