"use client";

import { useRef, useCallback } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { getAccessToken } from "@/lib/api-client";

/**
 * Stage update event from backend.
 */
export interface SSEStageEvent {
  stage: string;
  status: "started" | "completed" | "skipped";
  data?: any;
}

/**
 * Final completion event from backend.
 */
export interface SSECompleteEvent {
  artifact: any;
  artifact_id: string;
}

/**
 * Error event from backend.
 */
export interface SSEErrorEvent {
  message: string;
}

/**
 * Unified event type for the frontend to consume.
 */
export type PipelineEvent =
  | { type: "stage"; stage: string; status: SSEStageEvent["status"]; data?: any }
  | { type: "complete"; artifact: any; artifact_id: string }
  | { type: "error"; message: string };

/**
 * Request body for the generation endpoint.
 */
export interface GenerateRequest {
  markdown: string;
  title: string;
  force_refresh?: boolean;
}

interface UsePipelineSSEOptions {
  onEvent: (event: PipelineEvent) => void;
  onClose?: () => void;
}

/**
 * Hook to connect to the backend's SSE pipeline.
 * Uses @microsoft/fetch-event-source to support POST requests and custom headers.
 */
export function usePipelineSSE({ onEvent, onClose }: UsePipelineSSEOptions) {
  const ctrlRef = useRef<AbortController | null>(null);
  
  const onEventRef = useRef(onEvent);
  const onCloseRef = useRef(onClose);

  useEventCallbackRefs();

  function useEventCallbackRefs() {
    onEventRef.current = onEvent;
    onCloseRef.current = onClose;
  }


  const connect = useCallback(
    async (request: GenerateRequest) => {
      // Close any existing connection
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;

      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${apiUrl.replace(/\/$/, '')}/api/generate`;

      console.log("[SSE] Connecting to:", url);
      console.log("[SSE] Token present:", !!token);

      try {
        await fetchEventSource(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(request),
          signal: ctrl.signal,
          openWhenHidden: true,

          async onopen(response) {
            if (
              response.ok &&
              response.headers.get("content-type")?.includes("text/event-stream")
            ) {
              return; // everything's good
            } else if (
              response.status >= 400 &&
              response.status < 500 &&
              response.status !== 429
            ) {
              // client-side errors are usually non-retriable:
              throw new Error(`Fatal error (${response.status}): ${response.statusText || "see browser network tab"}`);
            } else {
              // server-side errors or rate limits: throw to trigger retry
              throw new Error(`Retryable error (${response.status}): ${response.statusText || "see browser network tab"}`);
            }
          },

          onmessage(msg) {
            // Handle different event types from backend
            if (msg.event === "stage_update") {
              try {
                const data = JSON.parse(msg.data) as SSEStageEvent;
                onEventRef.current({
                  type: "stage",
                  stage: data.stage,
                  status: data.status,
                  data: data.data,
                });
              } catch (e) {
                console.error("Failed to parse stage_update data:", e);
              }
            } else if (msg.event === "complete") {
              try {
                const data = JSON.parse(msg.data) as SSECompleteEvent;
                onEventRef.current({
                  type: "complete",
                  artifact: data.artifact,
                  artifact_id: data.artifact_id,
                });
                ctrl.abort(); // Close after completion
                onCloseRef.current?.();
              } catch (e) {
                console.error("Failed to parse complete data:", e);
              }
            } else if (msg.event === "error") {
              try {
                const data = JSON.parse(msg.data) as SSEErrorEvent;
                onEventRef.current({ type: "error", message: data.message });
                ctrl.abort(); // Close after error
                onCloseRef.current?.();
              } catch (e) {
                console.error("Failed to parse error data:", e);
              }
            }
          },

          onclose() {
            onCloseRef.current?.();
          },

          onerror(err) {
            // Log the error and rethrow to stop retrying unless it's an abort
            if (err.name === "AbortError") return;
            console.error("Pipeline SSE error:", err);
            onEventRef.current({ type: "error", message: "Connection lost." });
            throw err;
          },
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Fetch Event Source failed:", err);
        onEventRef.current({ type: "error", message: err.message || "Pipeline connection failed." });
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
  }, []);

  return { connect, disconnect };
}
