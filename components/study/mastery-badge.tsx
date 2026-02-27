import { cn } from "@/lib/utils";

export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

const MASTERY_CONFIG: Record<
  MasteryLevel,
  { label: string; color: string; bgColor: string; barWidth: string }
> = {
  new: {
    label: "New",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    barWidth: "w-0",
  },
  learning: {
    label: "Learning",
    color: "text-pipeline-draft",
    bgColor: "bg-pipeline-draft/10",
    barWidth: "w-1/3",
  },
  reviewing: {
    label: "Reviewing",
    color: "text-primary",
    bgColor: "bg-primary/10",
    barWidth: "w-2/3",
  },
  mastered: {
    label: "Mastered",
    color: "text-mastered",
    bgColor: "bg-mastered/10",
    barWidth: "w-full",
  },
};

interface MasteryBadgeProps {
  level: MasteryLevel;
  showBar?: boolean;
  className?: string;
}

export function MasteryBadge({
  level,
  showBar = false,
  className,
}: MasteryBadgeProps) {
  const config = MASTERY_CONFIG[level];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 font-mono text-xs font-medium",
          config.color,
          config.bgColor
        )}
      >
        {config.label}
      </span>
      {showBar && (
        <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", {
              "bg-muted-foreground/30": level === "new",
              "bg-pipeline-draft": level === "learning",
              "bg-primary": level === "reviewing",
              "bg-mastered": level === "mastered",
            })}
            style={{ width: config.barWidth }}
          />
        </div>
      )}
    </div>
  );
}

interface MasteryIndicatorRowProps {
  level: MasteryLevel;
  dueDate?: string;
  interval?: number; // days until next review
}

export function MasteryIndicatorRow({
  level,
  dueDate,
  interval,
}: MasteryIndicatorRowProps) {
  return (
    <div className="flex items-center gap-3">
      <MasteryBadge level={level} showBar />
      {interval !== undefined && (
        <span className="text-xs text-muted-foreground">
          Next review in{" "}
          <span className="font-medium text-foreground">{interval}d</span>
        </span>
      )}
      {dueDate && (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(dueDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
