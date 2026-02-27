import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

interface StatsOverviewProps {
  stats: Stat[];
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="border border-border bg-card p-4">
          <dt className="mb-1 text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="font-mono text-2xl font-semibold text-foreground">
            {stat.value}
          </dd>
          {stat.subValue && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.subValue}</p>
          )}
          {stat.trend && stat.trendValue && (
            <div className="mt-1.5 flex items-center gap-1">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                aria-hidden="true"
                className={cn(
                  stat.trend === "up"
                    ? "text-primary rotate-0"
                    : stat.trend === "down"
                    ? "text-destructive rotate-180"
                    : "text-muted-foreground"
                )}
              >
                <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  stat.trend === "up"
                    ? "text-primary"
                    : stat.trend === "down"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {stat.trendValue}
              </span>
            </div>
          )}
        </div>
      ))}
    </dl>
  );
}
