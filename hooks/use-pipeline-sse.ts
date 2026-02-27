"use client";

import { useRef, useCallback } from "react";
import { getAccessToken } from "@/lib/api-client";

export type PipelineEvent =
  | { type: "stage"; stageId: string; status: "active" | "done" | "failed"; detail?: string }
  | { type: "chunk"; current: number; total: number }
  | { type: "complete"; qaCount: number }
  | { type: "error"; message: string };

interface UsePipelineSSEOptions {
  onEvent: (event: PipelineEvent) => void;
  onClose?: () => void;
}

export function usePipelineSSE({ onEvent, onClose }: UsePipelineSSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (pipelineId: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const token = getAccessToken();
          const res = await fetch(`/api/process/pipeline/${pipelineId}/status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) return;
          const data = await res.json();

          if (data.stage) {
            onEvent({
              type: "stage",
              stageId: data.stage.id,
              status: data.stage.status,
              detail: data.stage.detail,
            });
          }
          if (data.chunk !== undefined) {
            onEvent({ type: "chunk", current: data.chunk, total: data.total });
          }
          if (data.status === "complete") {
            onEvent({ type: "complete", qaCount: data.qaCount ?? 0 });
            stopPolling();
            onClose?.();
          }
          if (data.status === "failed") {
            onEvent({ type: "error", message: data.error ?? "Pipeline failed." });
            stopPolling();
            onClose?.();
          }
        } catch {
          // Network error — keep trying
        }
      }, 2000);
    },
    [onEvent, onClose, stopPolling]
  );

  const connect = useCallback(
    (pipelineId: string) => {
      // Close any existing connection
      esRef.current?.close();

      const token = getAccessToken();
      const url = `/api/process/pipeline/${pipelineId}/events${token ? `?token=${token}` : ""}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as PipelineEvent;
          onEvent(event);
          if (event.type === "complete" || event.type === "error") {
            es.close();
            onClose?.();
          }
        } catch {
          // Malformed event — ignore
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Fall back to polling when SSE fails
        startPolling(pipelineId);
      };
    },
    [onEvent, onClose, startPolling]
  );

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    stopPolling();
  }, [stopPolling]);

  return { connect, disconnect };
}
