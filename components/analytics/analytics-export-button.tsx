"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";

type AnalyticsExportFormat = "json" | "csv";

export function AnalyticsExportButton() {
  const [loading, setLoading] = useState<AnalyticsExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: AnalyticsExportFormat) => {
    setLoading(format);
    setError(null);

    try {
      const blob = await api.blob(`/api/artifacts/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study-history.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {(["json", "csv"] as AnalyticsExportFormat[]).map((fmt) => (
          <button
            key={fmt}
            onClick={() => handleExport(fmt)}
            disabled={loading !== null}
            className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase transition-colors hover:border-secondary hover:text-foreground disabled:opacity-50"
          >
            {loading === fmt ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 9.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            {fmt}
          </button>
        ))}
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
