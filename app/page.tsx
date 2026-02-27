"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { PipelineStatus, DEFAULT_STAGES } from "@/components/pipeline-status";

const SAMPLE_MARKDOWN = `# The Water Cycle

## Evaporation

Water from oceans, lakes, and rivers transforms into water vapor when heated by the sun. This process moves approximately 502,800 km³ of water into the atmosphere each year.

## Condensation

As water vapor rises and cools, it condenses around tiny particles to form clouds and fog. The dew point is the temperature at which condensation begins.

## Precipitation

Water returns to Earth's surface as rain, snow, sleet, or hail, depending on atmospheric temperature and pressure conditions.`;

type Stage = {
  id: string;
  label: string;
  description: string;
  color: string;
  status: "idle" | "active" | "done" | "failed";
  detail?: string;
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

  const updateStage = (
    id: string,
    status: Stage["status"],
    detail?: string
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail } : s))
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runSimulation = async (chunks: number) => {
    setTotalChunks(chunks);
    setCurrentChunk(0);
    setQaCount(0);
    setStages(DEFAULT_STAGES);
    setIsRunning(true);
    setIsDone(false);

    for (let i = 1; i <= chunks; i++) {
      setCurrentChunk(i);

      updateStage("check", "active", `Hashing chunk ${i}...`);
      await sleep(600);
      updateStage("check", "done", `No existing record found — processing.`);

      updateStage("draft", "active", "Calling LLM for outline + Q&A draft...");
      await sleep(1200);
      updateStage("draft", "done", "Generated 3 Q&A pairs.");

      updateStage("judge", "active", "Evaluating each Q&A pair...");
      await sleep(1000);
      const passAll = Math.random() > 0.4;
      if (passAll) {
        updateStage("judge", "done", "All pairs passed (score ≥ 0.7).");
        updateStage("revise", "idle", "No revisions needed.");
      } else {
        updateStage("judge", "done", "1 pair below threshold — revising.");
        updateStage("revise", "active", "Revising 1 failing Q&A pair...");
        await sleep(900);
        updateStage("revise", "done", "Revision cycle 1 complete.");
      }

      updateStage("save", "active", "Persisting artifact to SQLite...");
      await sleep(500);
      updateStage("save", "done", `Artifact saved for chunk ${i}.`);

      setQaCount((prev) => prev + 3);

      if (i < chunks) {
        await sleep(400);
        setStages(DEFAULT_STAGES);
      }
    }

    setIsRunning(false);
    setIsDone(true);
  };

  const handleSubmit = () => {
    if (!markdown.trim() || !bookName.trim() || !chapterName.trim()) return;
    const headers = markdown.match(/^#{1,2} .+/gm) ?? [];
    const chunks = Math.max(1, headers.length);
    runSimulation(chunks);
  };

  const handleReset = () => {
    setMarkdown("");
    setBookName("");
    setChapterName("");
    setStages(DEFAULT_STAGES);
    setIsRunning(false);
    setIsDone(false);
    setCurrentChunk(0);
    setTotalChunks(0);
    setQaCount(0);
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
