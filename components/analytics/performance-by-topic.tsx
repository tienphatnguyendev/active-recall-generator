import { cn } from "@/lib/utils";

interface TopicPerformance {
  topic: string;
  source: string;
  totalCards: number;
  knownPct: number;
  unsurePct: number;
  unknownPct: number;
}

interface PerformanceByTopicProps {
  topics: TopicPerformance[];
}

export function PerformanceByTopic({ topics }: PerformanceByTopicProps) {
  const sorted = [...topics].sort((a, b) => a.knownPct - b.knownPct); // Weakest first

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Performance by topic
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Weakest topics listed first — focus here.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((topic) => (
          <div key={`${topic.source}-${topic.topic}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{topic.topic}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{topic.source}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs font-semibold",
                  topic.knownPct >= 80
                    ? "text-primary"
                    : topic.knownPct >= 50
                    ? "text-pipeline-draft"
                    : "text-destructive"
                )}
              >
                {topic.knownPct}%
              </span>
            </div>
            {/* Stacked bar */}
            <div
              className="flex h-1.5 w-full overflow-hidden rounded-sm"
              aria-label={`${topic.topic}: ${topic.knownPct}% known`}
            >
              <div className="bg-primary transition-all" style={{ width: `${topic.knownPct}%` }} />
              <div className="bg-pipeline-draft transition-all" style={{ width: `${topic.unsurePct}%` }} />
              <div className="bg-destructive/50 transition-all" style={{ width: `${topic.unknownPct}%` }} />
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No topic performance data yet. Complete a study session to see results.
          </p>
        )}
      </div>
    </div>
  );
}
