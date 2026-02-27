import { cn } from "@/lib/utils";
import { MasteryBadge, type MasteryLevel } from "@/components/study/mastery-badge";

interface StudyEvent {
  date: string;
  rating: "know" | "unsure" | "unknown";
}

interface WeakArea {
  question: string;
  timesUnknown: number;
  lastAttempted: string;
}

interface ArtifactProgressDetailProps {
  artifactId: string;
  section: string;
  source: string;
  mastery: MasteryLevel;
  studyTimeline: StudyEvent[];
  weakAreas: WeakArea[];
  nextSessionSuggestion: string;
}

export function ArtifactProgressDetail({
  section,
  source,
  mastery,
  studyTimeline,
  weakAreas,
  nextSessionSuggestion,
}: ArtifactProgressDetailProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{source}</p>
            <h3 className="mt-0.5 text-lg font-semibold text-foreground">{section}</h3>
          </div>
          <MasteryBadge level={mastery} showBar />
        </div>

        {/* Next session suggestion */}
        <div className="mt-4 border-l-2 border-primary bg-primary/5 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary">Suggestion</p>
          <p className="mt-0.5 text-xs text-foreground">{nextSessionSuggestion}</p>
        </div>
      </div>

      {/* Study timeline */}
      {studyTimeline.length > 0 && (
        <div className="border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Study timeline
          </p>
          <div className="flex items-end gap-1" style={{ height: "48px" }}>
            {studyTimeline.map((event, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm transition-colors",
                  event.rating === "know"
                    ? "bg-primary"
                    : event.rating === "unsure"
                    ? "bg-pipeline-draft"
                    : "bg-destructive/50"
                )}
                style={{ height: `${event.rating === "know" ? 100 : event.rating === "unsure" ? 66 : 33}%` }}
                title={`${event.date}: ${event.rating}`}
                aria-label={`${event.date}: rated ${event.rating}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-primary" /> Know</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-pipeline-draft" /> Unsure</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 bg-destructive/50" /> Unknown</span>
          </div>
        </div>
      )}

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Weak areas
          </p>
          <div className="space-y-2">
            {weakAreas.map((area, i) => (
              <div key={i} className="flex items-start gap-3 rounded-sm border border-border px-3 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-destructive/10 font-mono text-[10px] font-semibold text-destructive">
                  {area.timesUnknown}
                </span>
                <div>
                  <p className="text-xs text-foreground">{area.question}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    Last attempted {new Date(area.lastAttempted).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
