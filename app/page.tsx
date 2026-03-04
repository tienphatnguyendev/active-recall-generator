"use client";

import { Nav } from "@/components/nav";
import { useAuth } from "@/components/auth/auth-context";
import { PipelineStatus } from "@/components/pipeline-status";
import { usePipeline } from "@/components/pipeline/pipeline-context";
import { SAMPLE_MARKDOWN } from "@/lib/constants/pipeline";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export default function GeneratePage() {
  const { isAuthenticated } = useAuth();
  
  const {
    markdown, setMarkdown,
    bookName, setBookName,
    chapterName, setChapterName,
    forceRefresh, setForceRefresh,
    isRunning,
    isDone,
    stages,
    currentChunk,
    totalChunks,
    qaCount,
    error,
    handleSubmit,
    handleReset,
  } = usePipeline();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setChapterName(nameWithoutExtension);

        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === "string") {
            setMarkdown(text);
          }
        };
        reader.readAsText(file);
      }
    },
    [setChapterName, setMarkdown]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isRunning,
  });

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

            {/* Markdown input */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Markdown chapter
                </label>
                <div className="flex items-center gap-3">
                  {markdown && (
                    <button
                      type="button"
                      onClick={() => setMarkdown("")}
                      className="text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={isRunning}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMarkdown(SAMPLE_MARKDOWN)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                    disabled={isRunning}
                  >
                    Load sample
                  </button>
                </div>
              </div>

              {!markdown ? (
                <div
                  {...getRootProps()}
                  className={`flex h-[400px] cursor-pointer flex-col items-center justify-center border border-dashed transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                  } ${isRunning ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <svg
                      className="mb-4 h-10 w-10 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm font-semibold text-foreground">
                      {isDragActive ? "Drop file here" : "Click or drag to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Markdown (.md) or Text (.txt)
                    </p>
                  </div>
                </div>
              ) : (
                <textarea
                  id="markdown-input"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  disabled={isRunning}
                  placeholder="# Chapter Title\n\n## Section 1\n\nPaste your content here..."
                  className="h-[400px] w-full resize-none border border-border bg-card px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              )}
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
                    !isAuthenticated ||
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

            {/* Auth warning */}
            {!isAuthenticated && (
              <div className="border border-primary/30 bg-primary/5 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Sign in required
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You must{" "}
                  <a href="/login" className="font-medium text-primary hover:underline">
                    sign in
                  </a>{" "}
                  to run the pipeline.
                </p>
              </div>
            )}

            {/* Info card or Error */}
            {isAuthenticated && !isRunning && !isDone && (
              <div className={`border p-5 ${error ? "border-destructive/50 bg-destructive/10" : "border-border bg-card"}`}>
                {error ? (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-destructive">
                      Pipeline Error
                    </p>
                    <p className="text-sm leading-relaxed text-destructive/90">
                      {error}
                    </p>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}