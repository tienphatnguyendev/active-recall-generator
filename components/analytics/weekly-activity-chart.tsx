import { cn } from "@/lib/utils";

interface DayActivity {
  date: string;
  cardsStudied: number;
  sessionCount: number;
}

interface WeeklyActivityChartProps {
  data: DayActivity[];
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const maxCards = Math.max(...data.map((d) => d.cardsStudied), 1);

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Weekly activity
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Cards studied per day</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 bg-primary" />
            Cards
          </span>
        </div>
      </div>

      <div
        className="flex items-end gap-2"
        role="img"
        aria-label="Weekly cards studied bar chart"
      >
        {data.map((day) => {
          const heightPct = Math.max(4, (day.cardsStudied / maxCards) * 100);

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">
                {day.cardsStudied > 0 ? day.cardsStudied : ""}
              </span>
              <div className="flex w-full flex-col justify-end" style={{ height: "80px" }}>
                <div
                  className={cn(
                    "w-full transition-all",
                    day.cardsStudied > 0 ? "bg-primary" : "bg-muted"
                  )}
                  style={{ height: `${heightPct}%` }}
                  aria-label={`${day.date}: ${day.cardsStudied} cards`}
                />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
