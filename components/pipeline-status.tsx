"use client";

import { cn } from "@/lib/utils";
import { StageStatus, PipelineStage } from "@/lib/constants/pipeline";

interface PipelineStatusProps {
  stages: PipelineStage[];
  currentChunk?: number;
  totalChunks?: number;
}

function StageIcon({
  status,
  color,
}: {
  status: StageStatus;
  color: string;
}) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 6L5 9L10 3"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="hsl(var(--destructive))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  if (status === "active") {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full animate-pulse-slow"
        style={{ backgroundColor: `${color}20` }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
    </span>
  );
}

export function PipelineStatus({
  stages,
  currentChunk,
  totalChunks,
}: PipelineStatusProps) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Pipeline</p>
        {totalChunks !== undefined && currentChunk !== undefined && (
          <span className="font-mono text-xs text-muted-foreground">
            chunk {currentChunk}/{totalChunks}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="relative">
            {index < stages.length - 1 && (
              <div className="absolute left-3.5 top-7 h-4 w-px bg-border" />
            )}
            <div
              className={cn(
                "flex items-start gap-3 rounded-md p-2 transition-colors",
                stage.status === "active" && "bg-surface"
              )}
            >
              <StageIcon status={stage.status} color={stage.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      stage.status === "idle"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {stage.label}
                  </span>
                  {stage.status === "active" && (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-xs font-medium"
                      style={{
                        color: stage.color,
                        backgroundColor: `${stage.color}18`,
                      }}
                    >
                      running
                    </span>
                  )}
                  {stage.status === "done" && (
                    <span className="px-1.5 py-0.5 font-mono text-xs font-medium text-primary bg-primary/10">
                      done
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {stage.detail ?? stage.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
