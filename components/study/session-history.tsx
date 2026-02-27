"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SessionResult {
  id: string;
  completedAt: string;
  totalCards: number;
  know: number;
  unsure: number;
  unknown: number;
  durationSeconds: number;
  sources: string[];
}

interface SessionHistoryProps {
  sessions: SessionResult[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Session history
        </p>
        <span className="font-mono text-xs text-muted-foreground">
          {sessions.length} sessions
        </span>
      </div>

      {sessions.map((session) => {
        const knownPct = Math.round((session.know / session.totalCards) * 100);
        const isExpanded = expandedId === session.id;

        return (
          <div key={session.id} className="border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              className="flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-surface"
              aria-expanded={isExpanded}
            >
              {/* Date */}
              <div className="w-20 shrink-0">
                <p className="font-mono text-xs text-foreground">
                  {new Date(session.completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {new Date(session.completedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {/* Mini bar */}
              <div className="flex-1 space-y-1">
                <div className="flex h-2 overflow-hidden rounded-sm">
                  <div className="bg-primary transition-all" style={{ width: `${(session.know / session.totalCards) * 100}%` }} />
                  <div className="bg-pipeline-draft transition-all" style={{ width: `${(session.unsure / session.totalCards) * 100}%` }} />
                  <div className="bg-destructive/50 transition-all" style={{ width: `${(session.unknown / session.totalCards) * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {session.totalCards} cards &middot; {knownPct}% known
                </p>
              </div>

              {/* Duration */}
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatDuration(session.durationSeconds)}
              </span>

              <svg
                className={cn("shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isExpanded && (
              <div className="animate-slide-up border-t border-border px-3 pb-3 pt-2">
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {[
                    { label: "Know", count: session.know, cls: "text-primary bg-primary/10" },
                    { label: "Unsure", count: session.unsure, cls: "text-pipeline-draft bg-pipeline-draft/10" },
                    { label: "Unknown", count: session.unknown, cls: "text-destructive bg-destructive/10" },
                  ].map(({ label, count, cls }) => (
                    <div key={label} className="border border-border p-2 text-center">
                      <p className={cn("font-mono text-lg font-semibold", cls.split(" ")[0])}>{count}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {session.sources.map((src) => (
                    <span key={src} className="bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
