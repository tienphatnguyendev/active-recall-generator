"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { usePipelineSSE, PipelineEvent } from "@/hooks/use-pipeline-sse";
import { revalidateArtifacts } from "@/app/actions/artifacts";
import {
  STAGE_MAP,
  DEFAULT_STAGES,
  PipelineStage,
  StageStatus,
} from "@/lib/constants/pipeline";

interface PipelineState {
  markdown: string;
  setMarkdown: (v: string) => void;
  bookName: string;
  setBookName: (v: string) => void;
  chapterName: string;
  setChapterName: (v: string) => void;
  forceRefresh: boolean;
  setForceRefresh: (v: boolean) => void;
  isRunning: boolean;
  isDone: boolean;
  stages: PipelineStage[];
  currentChunk: number;
  totalChunks: number;
  qaCount: number;
  error: string | null;
  handleSubmit: () => Promise<void>;
  handleReset: () => void;
}

const PipelineContext = createContext<PipelineState | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
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

  const updateStage = useCallback(
    (id: string, status: StageStatus, detail?: string) => {
      setStages((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status, detail: detail ?? s.description } : s
        )
      );
    },
    []
  );

  const { connect, disconnect } = usePipelineSSE({
    onEvent: (event: PipelineEvent) => {
      switch (event.type) {
        case "stage": {
          const uiId = STAGE_MAP[event.stage] || event.stage;
          let status: StageStatus = "active";
          if (
            event.status === "completed" ||
            event.status === "skipped"
          ) {
            status = "done";
          }

          let detail = "";
          if (event.stage === "outline_draft" && event.data?.item_count) {
            detail = `Generated ${event.data.item_count} outline items.`;
          } else if (event.stage === "qa_draft" && event.data?.qa_count) {
            detail = `Generated ${event.data.qa_count} Q&A pairs.`;
          } else if (
            event.stage === "judge" &&
            event.status === "completed"
          ) {
            detail =
              event.data?.failing_count > 0
                ? `${event.data.failing_count} pairs failed threshold — revising.`
                : "All pairs passed (score ≥ 0.7).";
          } else if (event.stage === "revise" && event.data?.revision_count) {
            detail = `Revision cycle ${event.data.revision_count} complete.`;
          } else if (event.status === "skipped") {
            detail = "No existing record found — processing.";
          }

          updateStage(uiId, status, detail || undefined);
          break;
        }
        case "complete": {
          if (event.artifact?.qa_pairs) {
            setQaCount((prev) => prev + event.artifact.qa_pairs.length);
          }
          resolveRef.current?.();
          break;
        }
        case "error": {
          setError(event.message);
          setStages((prev) =>
            prev.map((s) =>
              s.status === "active"
                ? { ...s, status: "failed", detail: event.message }
                : s
            )
          );
          rejectRef.current?.(new Error(event.message));
          break;
        }
      }
    },
    onClose: () => {
      // Handled by resolve/reject
    },
  });

  const handleSubmit = async () => {
    if (!markdown.trim() || !bookName.trim() || !chapterName.trim()) return;

    const chunks = markdown
      .split(/(?=^#{1,2} )/gm)
      .filter((c) => c.trim().length > 0);
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
        if (i > 0) setStages(DEFAULT_STAGES);

        const match = chunks[i].match(/^#{1,2}\s+(.+)$/m);
        let chunkTitle = match ? match[1].trim() : `Chunk ${i + 1}`;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);


  return (
    <PipelineContext.Provider
      value={{
        markdown,
        setMarkdown,
        bookName,
        setBookName,
        chapterName,
        setChapterName,
        forceRefresh,
        setForceRefresh,
        isRunning,
        isDone,
        stages,
        currentChunk,
        totalChunks,
        qaCount,
        error,
        handleSubmit,
        handleReset,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used inside <PipelineProvider>");
  return ctx;
}
