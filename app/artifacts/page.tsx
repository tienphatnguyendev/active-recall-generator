"use client";

import { useState, useEffect } from "react";
import { Nav } from "@/components/nav";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeletons";

interface QAPair {
  question: string;
  answer: string;
  sourceContext: string;
  judgeScore: number;
  judgeFeedback: string;
}

interface OutlineItem {
  title: string;
  level: number;
  items: OutlineItem[];
}

interface Artifact {
  id: string;
  source: string;
  book: string;
  chapter: string;
  section: string;
  createdAt: string;
  outline: OutlineItem[];
  qaPairs: QAPair[];
}

const MOCK_ARTIFACTS: Artifact[] = [
  {
    id: "biology-101-chapter5-water-cycle",
    source: "Biology101:Chapter5",
    book: "Biology 101",
    chapter: "Chapter 5",
    section: "The Water Cycle",
    createdAt: "2026-02-26T14:32:00Z",
    outline: [
      {
        title: "The Water Cycle",
        level: 1,
        items: [
          { title: "Evaporation", level: 2, items: [] },
          { title: "Condensation", level: 2, items: [] },
          { title: "Precipitation", level: 2, items: [] },
        ],
      },
    ],
    qaPairs: [
      {
        question: "What is the primary driver of evaporation from ocean surfaces?",
        answer: "Solar radiation (sunlight) heats the water surface, providing the energy needed to convert liquid water into water vapor.",
        sourceContext: "Water from oceans, lakes, and rivers transforms into water vapor when heated by the sun.",
        judgeScore: 0.94,
        judgeFeedback: "Clear, accurate, and tests genuine recall. Well-scoped.",
      },
      {
        question: "At what temperature does condensation begin?",
        answer: "Condensation begins at the dew point — the temperature at which air becomes saturated and water vapor starts converting back to liquid.",
        sourceContext: "The dew point is the temperature at which condensation begins.",
        judgeScore: 0.88,
        judgeFeedback: "Accurate and well-defined. Could reference humidity for completeness.",
      },
      {
        question: "What factors determine the form of precipitation?",
        answer: "Atmospheric temperature and pressure conditions determine whether precipitation falls as rain, snow, sleet, or hail.",
        sourceContext: "Water returns to Earth's surface as rain, snow, sleet, or hail, depending on atmospheric temperature and pressure conditions.",
        judgeScore: 0.91,
        judgeFeedback: "Excellent recall-worthiness. Tests understanding of conditions, not just definitions.",
      },
    ],
  },
  {
    id: "cs-fundamentals-chapter2-algorithms",
    source: "CSFundamentals:Chapter2",
    book: "CS Fundamentals",
    chapter: "Chapter 2",
    section: "Algorithm Complexity",
    createdAt: "2026-02-25T09:15:00Z",
    outline: [
      {
        title: "Algorithm Complexity",
        level: 1,
        items: [
          { title: "Big-O Notation", level: 2, items: [] },
          { title: "Time vs. Space Complexity", level: 2, items: [] },
        ],
      },
    ],
    qaPairs: [
      {
        question: "What does Big-O notation describe?",
        answer: "Big-O notation describes the upper bound of an algorithm's growth rate — how its time or space requirements scale as the input size grows toward infinity.",
        sourceContext: "Big-O notation provides an asymptotic upper bound on the complexity of an algorithm.",
        judgeScore: 0.96,
        judgeFeedback: "Excellent. Tests conceptual understanding, not just definition recall.",
      },
      {
        question: "What is the difference between time complexity and space complexity?",
        answer: "Time complexity measures how execution time grows with input size, while space complexity measures how memory usage grows. Both are typically expressed in Big-O notation.",
        sourceContext: "Time complexity and space complexity are the two primary dimensions of algorithm efficiency.",
        judgeScore: 0.89,
        judgeFeedback: "Clear distinction drawn. Good recall value.",
      },
    ],
  },
];

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 0.9
      ? "text-primary bg-primary/10"
      : score >= 0.7
      ? "text-pipeline-judge bg-pipeline-judge/10"
      : "text-destructive bg-destructive/10";

  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-xs font-medium", color)}>
      {score.toFixed(2)}
    </span>
  );
}

function OutlineTree({ items, depth = 0 }: { items: OutlineItem[]; depth?: number }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i}>
          <div
            className={cn(
              "flex items-center gap-2 text-xs",
              depth === 0 ? "text-foreground font-medium" : "text-muted-foreground"
            )}
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            <span className="h-px w-3 bg-border shrink-0" />
            {item.title}
          </div>
          {item.items.length > 0 && (
            <OutlineTree items={item.items} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>(MOCK_ARTIFACTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPairs, setExpandedPairs] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch artifacts on mount
  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/artifacts');
        if (!response.ok) throw new Error('Failed to fetch artifacts');
        const data = await response.json();
        setArtifacts(data.length ? data : MOCK_ARTIFACTS);
        setSelectedId((data[0]?.id) || MOCK_ARTIFACTS[0].id);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setArtifacts(MOCK_ARTIFACTS);
        setSelectedId(MOCK_ARTIFACTS[0].id);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtifacts();
  }, []);

  const selected = artifacts.find((a) => a.id === selectedId) || artifacts[0];

  const filteredPairs = selected.qaPairs.filter(
    (p) =>
      search === "" ||
      p.question.toLowerCase().includes(search.toLowerCase()) ||
      p.answer.toLowerCase().includes(search.toLowerCase())
  );

  const togglePair = (i: number) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const avgScore =
    selected.qaPairs.reduce((s, p) => s + p.judgeScore, 0) /
    selected.qaPairs.length;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 border-l-4 border-primary pl-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Artifacts
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              Processed chapters
            </h1>
          </div>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Artifacts
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Processed chapters
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse your generated Q&A artifacts and outlines stored in SQLite.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar: artifact list */}
          <div className="space-y-2 lg:col-span-1">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isLoading ? "Loading..." : `${artifacts.length} artifacts`}
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => {
                    setSelectedId(artifact.id);
                    setExpandedPairs(new Set());
                    setSearch("");
                  }}
                  className={cn(
                    "w-full border p-3 text-left transition-colors",
                    selectedId === artifact.id
                      ? "border-l-2 border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-surface"
                  )}
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {artifact.source}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-foreground text-balance">
                    {artifact.section}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {artifact.qaPairs.length} Q&A
                    </span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(artifact.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
          </div>

          {/* Main: artifact detail */}
          <div className="space-y-5 lg:col-span-3">
            {/* Meta */}
            <div className="flex flex-wrap items-start justify-between gap-4 border border-border bg-card p-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {selected.source}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {selected.section}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.book} — {selected.chapter}
                </p>
              </div>
              <dl className="flex gap-6">
                <div>
                  <dt className="text-xs text-muted-foreground">Q&A pairs</dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                    {selected.qaPairs.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Avg. judge score</dt>
                  <dd className="mt-0.5 font-mono text-lg font-semibold text-primary">
                    {avgScore.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Outline */}
            <div className="border border-border bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">Outline</p>
              <OutlineTree items={selected.outline} />
            </div>

            {/* Q&A pairs */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Q&A Pairs</p>
                <div className="relative">
                  <svg
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="rounded-md border border-border bg-input py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredPairs.map((pair, i) => (
                  <div
                    key={i}
                    className="border border-border bg-card overflow-hidden"
                  >
                    <button
                      onClick={() => togglePair(i)}
                      className="flex w-full items-start justify-between gap-4 p-4 text-left hover:bg-surface transition-colors"
                    >
                      <span className="text-sm text-foreground leading-relaxed text-balance">
                        {pair.question}
                      </span>
                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <ScoreBadge score={pair.judgeScore} />
                        <svg
                          className={cn(
                            "text-muted-foreground transition-transform",
                            expandedPairs.has(i) && "rotate-180"
                          )}
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 5L7 9L11 5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </button>

                    {expandedPairs.has(i) && (
                      <div className="border-t border-border px-4 pb-4 pt-3 animate-slide-up">
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Answer
                          </p>
                          <p className="text-sm leading-relaxed text-foreground">
                            {pair.answer}
                          </p>
                        </div>
                        <div className="mb-3 border-l-2 border-accent bg-surface px-3 py-2">
                          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Source context
                          </p>
                          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                            {pair.sourceContext}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <ScoreBadge score={pair.judgeScore} />
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {pair.judgeFeedback}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredPairs.length === 0 && (
                  <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      No Q&A pairs match your search.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
