"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
}

export function TagManager({
  tags,
  onChange,
  disabled = false,
  maxTags = 10,
}: TagManagerProps) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag) || tags.length >= maxTags) return;
    onChange([...tags, tag]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Tags{" "}
        <span className="text-muted-foreground/60">
          ({tags.length}/{maxTags})
        </span>
      </p>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 border border-border bg-background p-1.5 focus-within:ring-2 focus-within:ring-primary",
          disabled && "opacity-50"
        )}
      >
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(i)}
                aria-label={`Remove tag ${tag}`}
                className="text-primary/60 transition-colors hover:text-primary"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                  <path d="M2 2L6 6M6 2L2 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && tags.length < maxTags && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => input && addTag(input)}
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            className="flex-1 min-w-20 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            aria-label="Add a new tag"
          />
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/60">
        Press Enter or comma to add a tag.
      </p>
    </div>
  );
}
