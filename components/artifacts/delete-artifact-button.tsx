"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DeleteArtifactButtonProps {
  artifactId: string;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export function DeleteArtifactButton({
  artifactId,
  onDelete,
  className,
}: DeleteArtifactButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 4000);
      return;
    }
    handleDelete();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(artifactId);
    } catch {
      setError("Delete failed. Please try again.");
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isDeleting}
        className={cn(
          "flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          isConfirming
            ? "border-destructive bg-destructive/5 text-destructive"
            : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive",
          className
        )}
        aria-label={isConfirming ? "Confirm delete artifact" : "Delete artifact"}
      >
        {isDeleting ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-destructive/30 border-t-destructive" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 3h8M5 3V2h2v1M5 5v4M7 5v4M3 3l.5 7h5L9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isConfirming ? "Confirm delete?" : "Delete"}
      </button>
      {isConfirming && !isDeleting && (
        <p className="text-[10px] text-muted-foreground">
          Artifact is recoverable within 30 days.
        </p>
      )}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
