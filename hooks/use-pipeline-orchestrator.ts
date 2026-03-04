"use client";

import { useState, useRef, useCallback } from "react";
import { usePipelineSSE, PipelineEvent } from "@/hooks/use-pipeline-sse";
import { revalidateArtifacts } from "@/app/actions/artifacts";
import { 
  STAGE_MAP, 
  DEFAULT_STAGES, 
  PipelineStage, 
  StageStatus 
} from "@/lib/constants/pipeline";

export function usePipelineOrchestrator() {
  const [markdown, setMarkdown] = useState("");
  const [bookName, setBookName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
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
        case "stage": {
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
          break;
        }
        case "complete": {
          // For sequential chunks, we update the total QA count when a chunk is finished
          if (event.artifact?.qa_pairs) {
            setQaCount((prev) => prev + event.artifact.qa_pairs.length);
          }
          resolveRef.current?.();
          break;
        }
        case "error": {
          setError(event.message);
          // Mark the currently active stage as failed
          setStages(prev => prev.map(s => s.status === "active" ? { ...s, status: "failed", detail: event.message } : s));
          rejectRef.current?.(new Error(event.message));
          break;
        }
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

        // Extract chunk title from the first header, or fallback to Chunk N
        const match = chunks[i].match(/^#{1,2}\s+(.+)$/m);
        let chunkTitle = match ? match[1].trim() : `Chunk ${i + 1}`;
        // Clean up any trailing # symbols if present
        chunkTitle = chunkTitle.replace(/\s+#+$/, "");

        await new Promise<void>((resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current = reject;
          connect({
            markdown: chunks[i],
            title: `${bookName} - ${chapterName} - ${chunkTitle}`,
            force_refresh: forceRefresh,
          });
        });
      }
      await revalidateArtifacts();
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

  return {
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
  };
}