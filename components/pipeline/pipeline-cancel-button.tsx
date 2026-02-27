"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PipelineCancelButtonProps {
  pipelineId: string;
  onCancelled?: () => void;
  className?: string;
}

export function PipelineCancelButton({
  pipelineId,
  onCancelled,
  className,
}: PipelineCancelButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!isConfirming) {
      setIsConfirming(true);
      // Auto-reset confirmation state after 3 seconds
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/api/process/pipeline/${pipelineId}/cancel`);
      onCancelled?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to cancel.");
      }
    } finally {
      setIsLoading(false);
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          isConfirming
            ? "border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10"
            : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive",
          className
        )}
        aria-label={isConfirming ? "Confirm cancel pipeline" : "Cancel pipeline"}
      >
        {isLoading ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-destructive/30 border-t-destructive" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
        {isConfirming ? "Click again to confirm" : "Cancel pipeline"}
      </button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
