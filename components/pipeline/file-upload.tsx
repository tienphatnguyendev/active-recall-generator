"use client";

import {
  useState,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFile: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

export function FileUpload({
  onFile,
  accept = ".md,.markdown,text/markdown,text/plain",
  maxSizeMb = 5,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      return `File exceeds ${maxSizeMb} MB limit.`;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["md", "markdown", "txt"].includes(ext ?? "")) {
      return "Only .md, .markdown, or .txt files are supported.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload a markdown file"
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-secondary",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted-foreground">
          <path d="M12 4v12M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 18h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop to upload" : "Drop a Markdown file here"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            or <span className="text-primary">click to browse</span> — .md, .markdown, .txt up to {maxSizeMb} MB
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
