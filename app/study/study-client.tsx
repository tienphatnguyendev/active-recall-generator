"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { logStudySession } from "@/app/actions/study";

interface QAPair {
  question: string;
  answer: string;
  source: string;
  judgeScore: number;
}

type Rating = "know" | "unsure" | "unknown";

interface CardResult {
  id: string;
  rating: Rating;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StudyClient({ initialCards }: { initialCards: (QAPair & { id: string })[] }) {
  const [cards] = useState<(QAPair & { id: string })[]>(initialCards);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  const current = cards[currentIndex];

  const startSession = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setResults([]);
    setSessionDone(false);
    setSessionStarted(true);
    setCardStartTime(Date.now());
  };

  const rate = (rating: Rating) => {
    const durationMs = Date.now() - cardStartTime;
    
    // Fire-and-forget server action
    logStudySession(current.id, rating, durationMs).catch((err: unknown) => {
      console.error("Error logging study session", err);
    });

    const newResults = [...results, { id: current.id, rating }];
    setResults(newResults);

    if (currentIndex + 1 >= cards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
      setCardStartTime(Date.now());
    }
  };

  const know = results.filter((r) => r.rating === "know").length;
  const unsure = results.filter((r) => r.rating === "unsure").length;
  const unknown = results.filter((r) => r.rating === "unknown").length;

  if (!sessionStarted) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-10 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Study Mode
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Active recall session
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your Q&A pairs with spaced repetition-style card flipping.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Session card */}
          <div className="border border-border bg-card p-6 lg:col-span-2">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">All artifacts</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`${cards.length} cards across ${new Set(cards.map((c) => c.source)).size} sources`}
                </p>
              </div>
              <span className="font-mono text-2xl font-semibold text-foreground">
                {cards.length}
              </span>
            </div>

            <div className="mb-6 space-y-2">
              {Array.from(new Set(cards.map((c) => c.source))).map((src) => {
                const count = cards.filter((c) => c.source === src).length;
                return (
                  <div key={src} className="flex items-center justify-between rounded-md bg-surface px-3 py-2">
                    <span className="font-mono text-xs text-muted-foreground">{src}</span>
                    <span className="font-mono text-xs text-foreground">{count} cards</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={startSession}
              disabled={cards.length === 0}
              className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Start session
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Tips */}
          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">How to study</p>
            <ol className="space-y-3">
              {[
                { n: "1", tip: "Read the question carefully before flipping the card." },
                { n: "2", tip: "Rate honestly: Know it, Unsure, or Didn't know." },
                { n: "3", tip: "Unsure and unknown cards are candidates for re-study." },
              ].map(({ n, tip }) => (
                  <li key={n} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-primary">
                      0{n}
                    </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
    );
  }

  if (sessionDone) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Session complete
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Results
          </h1>
        </div>

        <div className="border border-border bg-card p-8">
          {/* Score summary */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            {[
              { label: "Know it", count: know, color: "text-primary" },
              { label: "Unsure", count: unsure, color: "text-pipeline-draft" },
              { label: "Unknown", count: unknown, color: "text-destructive" },
            ].map(({ label, count, color }) => (
              <div key={label} className="border border-border bg-surface p-4 text-center">
                <p className={cn("font-mono text-3xl font-semibold", color)}>{count}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Per-card breakdown */}
          <div className="space-y-2">
            {results.map((result, i) => {
              const card = cards.find((c) => c.id === result.id)!;
              return (
                <div
                  key={result.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                >
                  <p className="text-xs text-muted-foreground truncate mr-4">
                    {i + 1}. {card.question}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 font-mono text-xs font-medium",
                      result.rating === "know"
                        ? "bg-primary/10 text-primary"
                        : result.rating === "unsure"
                        ? "bg-pipeline-draft/10 text-pipeline-draft"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {result.rating === "know"
                      ? "Know it"
                      : result.rating === "unsure"
                      ? "Unsure"
                      : "Unknown"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={startSession}
              className="flex-1 bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Study again
            </button>
            <a
              href="/artifacts"
              className="flex-1 border border-border py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              Browse artifacts
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-10">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {current.source}
          </span>
        </div>
        <ProgressBar value={currentIndex} max={cards.length} />
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative mb-5 min-h-56 cursor-pointer border transition-colors",
          flipped
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-secondary"
        )}
        onClick={() => !flipped && setFlipped(true)}
        role="button"
        aria-label={flipped ? "Answer revealed" : "Click to reveal answer"}
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !flipped && setFlipped(true)}
      >
        <div className="p-6 sm:p-8">
          {!flipped ? (
            <div className="animate-fade-in">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Question
              </p>
              <p className="text-lg font-medium leading-relaxed text-foreground text-balance">
                {current.question}
              </p>
              <div className="mt-8 flex items-center justify-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-muted-foreground/60">
                  Click to reveal answer
                </span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Question
              </p>
              <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                {current.question}
              </p>
              <div className="mb-3 h-px bg-border" />
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-primary">
                Answer
              </p>
              <p className="text-base font-medium leading-relaxed text-foreground">
                {current.answer}
              </p>
            </div>
          )}
        </div>

        {/* Judge score badge */}
        <div className="absolute right-3 top-3">
          <span className="font-mono text-[10px] text-muted-foreground/50">
            score {current.judgeScore.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Rating buttons (only shown after flip) */}
      {flipped && (
        <div className="animate-fade-in grid grid-cols-3 gap-3">
          <button
            onClick={() => rate("unknown")}
            className="border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            Didn&apos;t know
          </button>
          <button
            onClick={() => rate("unsure")}
            className="border border-accent/60 bg-accent/10 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/20"
          >
            Unsure
          </button>
          <button
            onClick={() => rate("know")}
            className="border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Know it
          </button>
        </div>
      )}

      {!flipped && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setFlipped(true)}
            className="bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Reveal answer
          </button>
        </div>
      )}
    </main>
  );
}
