"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TimeLimitInputProps {
  value: number | null; // minutes, null = no limit
  onChange: (minutes: number | null) => void;
}

export function TimeLimitInput({ value, onChange }: TimeLimitInputProps) {
  const [enabled, setEnabled] = useState(value !== null);
  const [minutes, setMinutes] = useState(value ?? 15);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    onChange(checked ? minutes : null);
  };

  const handleMinutesChange = (m: number) => {
    setMinutes(m);
    if (enabled) onChange(m);
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Time limit
        </p>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground">Enable</span>
        </label>
      </div>

      {enabled && (
        <div className="animate-fade-in flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={60}
            value={minutes}
            onChange={(e) => handleMinutesChange(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label={`Time limit: ${minutes} minutes`}
          />
          <span className="w-16 border border-border bg-card px-2 py-1 text-center font-mono text-xs text-foreground">
            {minutes} min
          </span>
        </div>
      )}
    </div>
  );
}

interface SessionTimerProps {
  totalSeconds: number;
  onExpire: () => void;
}

export function SessionTimer({ totalSeconds, onExpire }: SessionTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  const handleExpire = useCallback(() => {
    onExpire();
  }, [onExpire]);

  useEffect(() => {
    if (remaining <= 0) {
      handleExpire();
      return;
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, handleExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = (remaining / totalSeconds) * 100;
  const isUrgent = remaining <= 30;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border px-3 py-1.5",
        isUrgent ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      )}
      role="timer"
      aria-live="polite"
      aria-label={`${minutes}:${String(seconds).padStart(2, "0")} remaining`}
    >
      <svg
        className={cn(isUrgent ? "text-destructive" : "text-muted-foreground")}
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="6.5" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 4.5v2.8l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 1h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          isUrgent ? "text-destructive" : "text-foreground"
        )}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      <div className="flex-1 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isUrgent ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
