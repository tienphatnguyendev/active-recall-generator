"use client";

import { useState } from "react";
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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 0.9
      ? "text-primary bg-primary/10"
      : score >= 0.7
      ? "text-pipeline-draft bg-pipeline-draft/10"
      : "text-destructive bg-destructive/10";

  return (
    <span className={cn("px-1.5 py-0.5 font-mono text-xs font-medium", color)}>
      {score.toFixed(2)}
    </span>
  );
}

function OutlineTree({ items, depth = 0 }: { items: OutlineItem[]; depth?: number }) {
  if (!items || items.length === 0) return null;
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
          {item.items && item.items.length > 0 && (
            <OutlineTree items={item.items} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function ArtifactsClient({ artifacts }: { artifacts: Artifact[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(artifacts[0]?.id || null);
  const [expandedPairs, setExpandedPairs] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(
    new Set([artifacts[0]?.book || 'Untitled'])
  );
  const [bookSearch, setBookSearch] = useState("");

  const bookGroups = artifacts.reduce<Record<string, typeof artifacts[0][]>>((acc, a) => {
    const key = a.book || 'Untitled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const filteredBooks = Object.keys(bookGroups).filter(b =>
    b.toLowerCase().includes(bookSearch.toLowerCase())
  );

  // Determine if we're simulating a loading state based on external props
  // but since we fetch server-side, it's immediately available
  const isLoading = false; 

  const selected = artifacts.find((a) => a.id === selectedId) || artifacts[0];

  const filteredPairs = selected?.qaPairs?.filter(
    (p) =>
      search === "" ||
      p.question.toLowerCase().includes(search.toLowerCase()) ||
      p.answer.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const togglePair = (i: number) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const avgScore = selected?.qaPairs?.length
    ? selected.qaPairs.reduce((s, p) => s + (p.judgeScore || 0), 0) / selected.qaPairs.length
    : 0;

  if (artifacts.length === 0) {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
             <div className="rounded-lg border border-border bg-card px-4 py-10 text-center col-span-4">
                <p className="text-sm text-muted-foreground">
                  No artifacts found. Generate some notes first!
                </p>
              </div>
        </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {/* Sidebar: artifact list */}
        <div className="space-y-4 md:col-span-1">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isLoading ? "Loading..." : `${artifacts.length} artifacts`}
            </p>
            <input
              type="text"
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              placeholder="Filter books..."
              className="w-full border border-border bg-input py-1.5 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring mb-3"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBooks.map((bookName) => {
                const bookArtifacts = bookGroups[bookName];
                const isExpanded = expandedBooks.has(bookName);
                const totalQA = bookArtifacts.reduce((sum, a) => sum + (a.qaPairs?.length || 0), 0);

                return (
                  <div key={bookName} className="border border-border bg-card">
                    <button
                      onClick={() => {
                        setExpandedBooks(prev => {
                          const next = new Set(prev);
                          next.has(bookName) ? next.delete(bookName) : next.add(bookName);
                          return next;
                        });
                      }}
                      className="flex w-full items-center justify-between p-3 text-left hover:bg-surface transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">{bookName}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {bookArtifacts.length} chapters · {totalQA} Q&A
                        </p>
                      </div>
                      <svg
                        className={cn("text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")}
                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                      >
                        <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border flex flex-col">
                        {bookArtifacts.map((artifact) => (
                          <button
                            key={artifact.id}
                            onClick={() => {
                              setSelectedId(artifact.id);
                              setExpandedPairs(new Set());
                              setSearch("");
                            }}
                            className={cn(
                              "w-full border-b border-border last:border-b-0 p-3 text-left transition-colors relative group",
                              selectedId === artifact.id
                                ? "border-l-[3px] border-l-primary bg-primary/5 pl-[9px]"
                                : "bg-card hover:bg-surface"
                            )}
                          >
                            <p className="mt-0.5 text-xs font-medium text-foreground text-balance">
                              {artifact.chapter}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground mt-1">
                              {artifact.qaPairs?.length || 0} Q&A
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main: artifact detail */}
        <div className="space-y-5 md:col-span-2 lg:col-span-3">
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
            <dl className="flex items-center gap-6">
            <div>
                <dt className="text-xs text-muted-foreground">Q&A pairs</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                {selected.qaPairs?.length || 0}
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
                className="border border-border bg-input py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
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
  );
}
