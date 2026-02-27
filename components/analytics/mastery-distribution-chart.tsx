import { cn } from "@/lib/utils";
import type { MasteryLevel } from "@/components/study/mastery-badge";

interface MasteryDistributionData {
  level: MasteryLevel;
  count: number;
}

interface MasteryDistributionChartProps {
  data: MasteryDistributionData[];
  totalCards: number;
}

const LEVEL_CONFIG: Record<MasteryLevel, { label: string; barClass: string; textClass: string }> = {
  new: {
    label: "New",
    barClass: "bg-muted-foreground/30",
    textClass: "text-muted-foreground",
  },
  learning: {
    label: "Learning",
    barClass: "bg-pipeline-draft",
    textClass: "text-pipeline-draft",
  },
  reviewing: {
    label: "Reviewing",
    barClass: "bg-primary",
    textClass: "text-primary",
  },
  mastered: {
    label: "Mastered",
    barClass: "bg-green-500",
    textClass: "text-green-600",
  },
};

export function MasteryDistributionChart({
  data,
  totalCards,
}: MasteryDistributionChartProps) {
  const orderedLevels: MasteryLevel[] = ["mastered", "reviewing", "learning", "new"];
  const orderedData = orderedLevels.map(
    (level) => data.find((d) => d.level === level) ?? { level, count: 0 }
  );

  return (
    <div className="border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground">
        Mastery distribution
      </p>

      {/* Segmented bar */}
      <div
        className="mb-4 flex h-4 w-full overflow-hidden rounded-sm"
        role="img"
        aria-label="Mastery distribution bar"
      >
        {orderedData.map(({ level, count }) => {
          const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={level}
              className={cn("h-full transition-all", LEVEL_CONFIG[level].barClass)}
              style={{ width: `${pct}%` }}
              aria-label={`${LEVEL_CONFIG[level].label}: ${count} cards (${pct.toFixed(0)}%)`}
            />
          );
        })}
        {totalCards === 0 && (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {orderedData.map(({ level, count }) => {
          const config = LEVEL_CONFIG[level];
          const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;

          return (
            <div key={level} className="flex items-center gap-3">
              <div className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", config.barClass)} />
              <span className="flex-1 text-xs text-muted-foreground">{config.label}</span>
              <div className="flex items-center gap-2">
                <span className={cn("font-mono text-xs font-semibold", config.textClass)}>
                  {count}
                </span>
                <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
