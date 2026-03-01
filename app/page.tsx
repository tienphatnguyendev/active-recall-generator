"use client";

import { useState, useRef, useCallback } from "react";
import { Nav } from "@/components/nav";
import { PipelineStatus, DEFAULT_STAGES } from "@/components/pipeline-status";
import { usePipelineSSE, PipelineEvent } from "@/hooks/use-pipeline-sse";

const SAMPLE_MARKDOWN = `# The Water Cycle

## Evaporation

Water from oceans, lakes, and rivers transforms into water vapor when heated by the sun. This process moves approximately 502,800 km³ of water into the atmosphere each year.

## Condensation

As water vapor rises and cools, it condenses around tiny particles to form clouds and fog. The dew point is the temperature at which condensation begins.

## Precipitation

Water returns to Earth's surface as rain, snow, sleet, or hail, depending on atmospheric temperature and pressure conditions.`;

type StageStatus = "idle" | "active" | "done" | "failed";

type Stage = {
  id: string;
  label: string;
  description: string;
  color: string;
  status: StageStatus;
  detail?: string;
};

// Map backend stage names to UI stage IDs
const STAGE_MAP: Record<string, string> = {
  "check": "check",
  "outline_draft": "draft",
  "qa_draft": "draft",
  "judge": "judge",
  "revise": "revise",
  "save": "save",
  "saving_to_supabase": "save",
};

export default function GeneratePage() {
  const [markdown, setMarkdown] = useState("");
  const [bookName, setBookName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [qaCount, setQaCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs to control the promise-based sequential flow
  const resolveRef = useRef<(() => void) | null>(null);
  const rejectRef = useRef<((reason?: any) => void) | null>(null);

  const updateStage = useCallback((
    id: string,
    status: StageStatus,
    detail?: string
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.description } : s))
    );
  }, []);

  const { connect, disconnect } = usePipelineSSE({
    onEvent: (event: PipelineEvent) => {
      switch (event.type) {
        case "stage":
          const uiId = STAGE_MAP[event.stage] || event.stage;
          let status: StageStatus = "active";
          if (event.status === "completed" || event.status === "skipped") {
            status = "done";
          }
          
          let detail = "";
          if (event.stage === "outline_draft" && event.data?.item_count) {
            detail = `Generated ${event.data.item_count} outline items.`;
          } else if (event.stage === "qa_draft" && event.data?.qa_count) {
            detail = `Generated ${event.data.qa_count} Q&A pairs.`;
          } else if (event.stage === "judge" && event.status === "completed") {
            detail = event.data?.failing_count > 0 
              ? `${event.data.failing_count} pairs failed threshold — revising.` 
              : "All pairs passed (score ≥ 0.7).";
          } else if (event.stage === "revise" && event.data?.revision_count) {
            detail = `Revision cycle ${event.data.revision_count} complete.`;
          } else if (event.status === "skipped") {
            detail = "No existing record found — processing."; // Or relevant cache message
          }

          updateStage(uiId, status, detail || undefined);

          // Update QA count if provided in the event data
          if (event.data?.qa_count !== undefined) {
            setQaCount((prev) => {
              // Only update if it's larger or if we want to trust the backend's absolute count per chunk
              // Actually, backend sends count for the CURRENT chunk. We should probably add them up?
              // But for sequential, let's just use what the backend says for the chunk and add to total.
              return prev; // We'll handle summation in the loop if needed, or just set it.
            });
          }
          break;

        case "complete":
          // For sequential chunks, we update the total QA count when a chunk is finished
          if (event.artifact?.qa_pairs) {
            setQaCount((prev) => prev + event.artifact.qa_pairs.length);
          }
          resolveRef.current?.();
          break;

        case "error":
          setError(event.message);
          // Mark the currently active stage as failed
          setStages(prev => prev.map(s => s.status === "active" ? { ...s, status: "failed", detail: event.message } : s));
          rejectRef.current?.(new Error(event.message));
          break;
      }
    },
    onClose: () => {
      // Handled by resolve/reject
    }
  });

  const handleSubmit = async () => {
    if (!markdown.trim() || !bookName.trim() || !chapterName.trim()) return;
    
    // Split into chunks by headers
    const chunks = markdown.split(/(?=^#{1,2} )/gm).filter(c => c.trim().length > 0);
    const total = chunks.length;
    
    setTotalChunks(total);
    setCurrentChunk(0);
    setQaCount(0);
    setStages(DEFAULT_STAGES);
    setIsRunning(true);
    setIsDone(false);
    setError(null);

    try {
      for (let i = 0; i < total; i++) {
        setCurrentChunk(i + 1);
        // Reset stages for new chunk (except for the very first one)
        if (i > 0) setStages(DEFAULT_STAGES);

        await new Promise<void>((resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current = reject;
          connect({
            markdown: chunks[i],
            title: `${bookName}:${chapterName}`,
            force_refresh: forceRefresh,
          });
        });
      }
      setIsDone(true);
    } catch (err) {
      console.error("Pipeline execution failed:", err);
    } finally {
      setIsRunning(false);
      disconnect();
    }
  };

  const handleReset = () => {
    disconnect();
    setMarkdown("");
    setBookName("");
    setChapterName("");
    setStages(DEFAULT_STAGES);
    setIsRunning(false);
    setIsDone(false);
    setCurrentChunk(0);
    setTotalChunks(0);
    setQaCount(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Header — McKinsey report style: left blue rule, tight caps label */}
        <div className="mb-10 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Active Recall Generator
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Transform chapters into Q&A artifacts
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Paste a Markdown chapter below. The{" "}
            <span className="font-medium text-accent">Draft</span>{" "}
            →{" "}
            <span className="font-medium text-primary">Judge</span>{" "}
            →{" "}
            <span className="font-medium text-secondary-foreground">Revise</span>{" "}
            pipeline extracts a structured outline and high-quality Q&A pairs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Input */}
          <div className="space-y-4 lg:col-span-2">
            {/* Identifiers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="book-name"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Book name
                </label>
                <input
                  id="book-name"
                  type="text"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="e.g. Biology 101"
                  disabled={isRunning}
                  className="w-full border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label
                  htmlFor="chapter-name"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Chapter
                </label>
                <input
                  id="chapter-name"
                  type="text"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  placeholder="e.g. Chapter5"
                  disabled={isRunning}
                  className="w-full border border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Markdown textarea */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="markdown-input"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Markdown chapter
                </label>
                <button
                  type="button"
                  onClick={() => setMarkdown(SAMPLE_MARKDOWN)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Load sample
                </button>
              </div>
              <textarea
                id="markdown-input"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                disabled={isRunning}
                placeholder={"# Chapter Title\n\n## Section 1\n\nPaste your content here..."}
                rows={18}
                className="w-full resize-none border border-border bg-card px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {/* Options & submit */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  disabled={isRunning}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Force refresh (re-process all chunks)
                </span>
              </label>

              <div className="flex gap-2">
                {(isRunning || isDone) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isRunning}
                    className="border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isRunning ||
                    !markdown.trim() ||
                    !bookName.trim() ||
                    !chapterName.trim()
                  }
                  className="flex items-center gap-2 bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {isRunning ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
                      Processing...
                    </>
                  ) : (
                    "Run Pipeline"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Pipeline + Stats */}
          <div className="space-y-4">
            <PipelineStatus
              stages={stages}
              currentChunk={isRunning || isDone ? currentChunk : undefined}
              totalChunks={isRunning || isDone ? totalChunks : undefined}
            />

            {/* Stats */}
            {(isRunning || isDone) && (
              <div className="animate-fade-in border border-border bg-card p-5">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                  Output
                </p>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-xs text-muted-foreground">Chunks processed</dt>
                    <dd className="font-mono text-xs text-foreground">
                      {currentChunk}/{totalChunks}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs text-muted-foreground">Q&A pairs generated</dt>
                    <dd className="font-mono text-xs text-primary">{qaCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs text-muted-foreground">Source</dt>
                    <dd className="font-mono text-xs text-foreground truncate max-w-[120px]">
                      {bookName}:{chapterName}
                    </dd>
                  </div>
                </dl>

                {isDone && (
                  <div className="mt-4 border-l-2 border-primary bg-primary/5 px-3 py-2.5">
                    <p className="text-xs font-semibold text-primary">
                      Pipeline complete — {qaCount} Q&A pairs saved.
                    </p>
                    <a
                      href="/artifacts"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary"
                    >
                      Browse artifacts
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 5H8M5.5 2.5L8 5L5.5 7.5"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Info card */}
            {!isRunning && !isDone && (
              <div className="border border-border bg-card p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
                  How it works
                </p>
                <ol className="space-y-3">
                  {[
                    {
                      step: "01",
                      text: "Markdown is split into chunks by H1/H2 headers",
                    },
                    {
                      step: "02",
                      text: "Each chunk runs through Draft → Judge → Revise",
                    },
                    {
                      step: "03",
                      text: "Artifacts are stored in SQLite with deduplication",
                    },
                  ].map(({ step, text }) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-primary">
                        {step}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
