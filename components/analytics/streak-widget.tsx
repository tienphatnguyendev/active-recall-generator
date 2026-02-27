import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  /** ISO date strings for the last 7 days (most recent last) */
  recentDays: { date: string; studied: boolean }[];
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  studiedToday,
  recentDays,
}: StreakWidgetProps) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground">
        Study streak
      </p>

      <div className="mb-4 flex items-end gap-6">
        <div>
          <p className="font-mono text-4xl font-bold text-foreground">
            {currentStreak}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">day streak</p>
        </div>
        <div className="mb-1">
          <p className="font-mono text-xl font-semibold text-muted-foreground">
            {longestStreak}
          </p>
          <p className="text-[10px] text-muted-foreground">longest</p>
        </div>
      </div>

      {/* 7-day dots */}
      <div className="flex items-center gap-1.5" aria-label="Activity for the last 7 days">
        {recentDays.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "h-5 w-5 rounded-sm transition-colors",
                day.studied ? "bg-primary" : "bg-muted"
              )}
              title={`${day.date}: ${day.studied ? "Studied" : "No study"}`}
              aria-label={`${day.date}: ${day.studied ? "studied" : "not studied"}`}
            />
            <span className="font-mono text-[9px] text-muted-foreground">
              {new Date(day.date).toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>

      {!studiedToday && (
        <div className="mt-3 border-l-2 border-accent bg-accent/10 px-3 py-2">
          <p className="text-xs text-accent-foreground font-medium">
            Study today to keep your streak going.
          </p>
        </div>
      )}
    </div>
  );
}
