"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ExportFormat = "json" | "csv" | "pdf" | "anki";

interface ExportButtonProps {
  artifactId?: string; // undefined = export all
  className?: string;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON",
  csv: "CSV",
  pdf: "PDF",
  anki: "Anki",
};

export function ExportButton({ artifactId, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    setError(null);
    setIsOpen(false);

    try {
      const endpoint = artifactId
        ? `/api/artifacts/${artifactId}/export?format=${format}`
        : `/api/artifacts/export?format=${format}`;

      const blob = await api.blob(endpoint);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "anki" ? "apkg" : format;
      a.download = artifactId
        ? `artifact-${artifactId}.${ext}`
        : `artifacts-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Export failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={loading !== null}
        className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-secondary hover:text-foreground disabled:opacity-50"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {loading ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 9.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
        {loading ? `Exporting ${FORMAT_LABELS[loading]}...` : "Export"}
        {!loading && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className={cn("transition-transform", isOpen && "rotate-180")}
          >
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 border border-border bg-card shadow-md">
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="2" y="1" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.1" />
                <path d="M4 5h4M4 7h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              {FORMAT_LABELS[fmt]}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
