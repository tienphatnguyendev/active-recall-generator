"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DeletedArtifact {
  id: string;
  source: string;
  section: string;
  deletedAt: string;
}

interface RestoreArtifactsProps {
  artifacts: DeletedArtifact[];
  onRestore: (id: string) => Promise<void>;
  onEmpty?: () => void;
}

function daysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const diff = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function RestoreArtifacts({
  artifacts,
  onRestore,
  onEmpty,
}: RestoreArtifactsProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = artifacts.filter((a) => !restored.has(a.id));

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    setError(null);
    try {
      await onRestore(id);
      const next = new Set(restored);
      next.add(id);
      setRestored(next);
      if (next.size === artifacts.length) onEmpty?.();
    } catch {
      setError("Failed to restore. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  if (visible.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No deleted artifacts in the recycle bin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Deleted artifacts
        </p>
        <p className="text-xs text-muted-foreground">
          Recoverable within 30 days of deletion
        </p>
      </div>

      {error && (
        <div className="border-l-2 border-destructive bg-destructive/5 px-3 py-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {visible.map((artifact) => {
        const days = daysRemaining(artifact.deletedAt);
        const isUrgent = days <= 3;

        return (
          <div
            key={artifact.id}
            className="flex items-center justify-between gap-4 border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{artifact.source}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {artifact.section}
              </p>
              <p className={cn("mt-0.5 text-[10px] font-mono", isUrgent ? "text-destructive" : "text-muted-foreground")}>
                {isUrgent ? "Expires in" : "Expires in"} {days}d
              </p>
            </div>
            <button
              onClick={() => handleRestore(artifact.id)}
              disabled={restoringId === artifact.id}
              className="flex shrink-0 items-center gap-1.5 border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {restoringId === artifact.id ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6a4 4 0 1 1 4 4H4M2 6l2-2M2 6l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              Restore
            </button>
          </div>
        );
      })}
    </div>
  );
}
