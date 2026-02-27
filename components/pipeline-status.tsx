"use client";

import { cn } from "@/lib/utils";

type StageStatus = "idle" | "active" | "done" | "failed";

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  color: string;
  status: StageStatus;
  detail?: string;
}

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
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Pipeline</p>
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
              <div className="absolute left-3.5 top-7 h-2 w-px bg-border" />
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
                    <span className="rounded px-1.5 py-0.5 font-mono text-xs font-medium text-primary bg-primary/10">
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

export const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: "check",
    label: "Check Database",
    description: "Hash content and skip unchanged chunks",
    color: "#94a3b8",
    status: "idle",
  },
  {
    id: "draft",
    label: "Draft",
    description: "Generate outline and Q&A pairs via LLM",
    color: "hsl(38 92% 60%)",
    status: "idle",
  },
  {
    id: "judge",
    label: "Judge",
    description: "Score each Q&A on accuracy, clarity, recall-worthiness",
    color: "hsl(210 100% 66%)",
    status: "idle",
  },
  {
    id: "revise",
    label: "Revise",
    description: "Re-generate failing pairs (max 3 cycles)",
    color: "hsl(280 80% 65%)",
    status: "idle",
  },
  {
    id: "save",
    label: "Save to DB",
    description: "Persist artifact to SQLite",
    color: "hsl(158 64% 52%)",
    status: "idle",
  },
];
