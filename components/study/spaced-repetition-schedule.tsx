import { cn } from "@/lib/utils";
import { MasteryBadge, type MasteryLevel } from "./mastery-badge";

interface DueCard {
  id: string;
  question: string;
  mastery: MasteryLevel;
  dueDate: string;
  intervalDays: number;
}

interface UpcomingDay {
  date: string;
  count: number;
}

interface SpacedRepetitionScheduleProps {
  dueToday: DueCard[];
  upcoming: UpcomingDay[];
  onStartDue?: () => void;
}

export function SpacedRepetitionSchedule({
  dueToday,
  upcoming,
  onStartDue,
}: SpacedRepetitionScheduleProps) {
  return (
    <div className="space-y-5">
      {/* Due today */}
      <div className="border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Due today
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cards scheduled for review based on spaced repetition.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-semibold text-foreground">
              {dueToday.length}
            </span>
            {dueToday.length > 0 && onStartDue && (
              <button
                onClick={onStartDue}
                className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Study now
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2.5 6H9.5M7 3.5L9.5 6L7 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {dueToday.length > 0 ? (
          <div className="space-y-2">
            {dueToday.slice(0, 5).map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2"
              >
                <MasteryBadge level={card.mastery} />
                <p className="flex-1 truncate text-xs text-muted-foreground">
                  {card.question}
                </p>
              </div>
            ))}
            {dueToday.length > 5 && (
              <p className="text-center text-xs text-muted-foreground">
                +{dueToday.length - 5} more cards
              </p>
            )}
          </div>
        ) : (
          <div className="border-l-2 border-primary bg-primary/5 px-3 py-2">
            <p className="text-xs text-primary font-medium">
              All caught up — no cards due today.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Upcoming reviews
          </p>
          <div className="flex items-end gap-1.5">
            {upcoming.map((day) => {
              const maxCount = Math.max(...upcoming.map((d) => d.count), 1);
              const heightPct = Math.max(8, (day.count / maxCount) * 100);
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {day.count}
                  </span>
                  <div
                    className="w-full bg-primary/30 transition-all"
                    style={{ height: `${heightPct}%`, minHeight: "4px", maxHeight: "64px" }}
                    aria-label={`${day.count} cards on ${day.date}`}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
