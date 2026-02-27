"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface StudyArtifact {
  id: string;
  source: string;
  section: string;
  qaCount: number;
}

interface ArtifactSelectorProps {
  artifacts: StudyArtifact[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function ArtifactSelector({
  artifacts,
  selected,
  onChange,
}: ArtifactSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = artifacts.filter(
    (a) =>
      search === "" ||
      a.section.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase())
  );

  const allVisible = filtered.every((a) => selected.has(a.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisible) {
      filtered.forEach((a) => next.delete(a.id));
    } else {
      filtered.forEach((a) => next.add(a.id));
    }
    onChange(next);
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const totalCards = artifacts
    .filter((a) => selected.has(a.id))
    .reduce((s, a) => s + a.qaCount, 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Select artifacts
        </p>
        <span className="font-mono text-xs text-muted-foreground">
          {selected.size}/{artifacts.length} selected &middot; {totalCards} cards
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter artifacts..."
            className="w-full border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={toggleAll}
          className="border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {allVisible ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto">
        {filtered.map((artifact) => {
          const isSelected = selected.has(artifact.id);
          return (
            <label
              key={artifact.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 border p-3 transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:bg-surface"
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(artifact.id)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-muted-foreground">{artifact.source}</p>
                <p className="truncate text-xs font-medium text-foreground">{artifact.section}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {artifact.qaCount}Q
              </span>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No artifacts match.</p>
        )}
      </div>
    </div>
  );
}
