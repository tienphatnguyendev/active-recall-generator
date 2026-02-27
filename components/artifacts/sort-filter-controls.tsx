"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type SortField = "createdAt" | "avgScore" | "qaCount";
export type SortOrder = "asc" | "desc";

export interface ArtifactFilters {
  book: string;
  chapter: string;
  tag: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

interface SortFilterControlsProps {
  books: string[];
  chapters: string[];
  tags: string[];
  filters: ArtifactFilters;
  onFiltersChange: (filters: ArtifactFilters) => void;
}

const sortOptions: { value: SortField; label: string }[] = [
  { value: "createdAt", label: "Date created" },
  { value: "avgScore", label: "Avg. score" },
  { value: "qaCount", label: "Q&A count" },
];

export function SortFilterControls({
  books,
  chapters,
  tags,
  filters,
  onFiltersChange,
}: SortFilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    filters.book !== "",
    filters.chapter !== "",
    filters.tag !== "",
  ].filter(Boolean).length;

  const update = (partial: Partial<ArtifactFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const clearAll = () => {
    onFiltersChange({
      ...filters,
      book: "",
      chapter: "",
      tag: "",
    });
  };

  return (
    <div className="space-y-3">
      {/* Sort row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <div className="flex gap-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ sortBy: opt.value })}
                className={cn(
                  "border px-2.5 py-1 text-xs font-medium transition-colors",
                  filters.sortBy === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-secondary hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => update({ sortOrder: filters.sortOrder === "desc" ? "asc" : "desc" })}
          className="flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-secondary hover:text-foreground"
          aria-label={`Sort ${filters.sortOrder === "desc" ? "ascending" : "descending"}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={cn("transition-transform", filters.sortOrder === "asc" && "rotate-180")}
          >
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {filters.sortOrder === "desc" ? "Desc" : "Asc"}
        </button>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          className={cn(
            "ml-auto flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors",
            activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-secondary hover:text-foreground"
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 3h10M3 6h6M5 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {isExpanded && (
        <div className="animate-fade-in border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <SelectFilter
              label="Book"
              value={filters.book}
              options={books}
              placeholder="All books"
              onChange={(v) => update({ book: v })}
            />
            <SelectFilter
              label="Chapter"
              value={filters.chapter}
              options={chapters}
              placeholder="All chapters"
              onChange={(v) => update({ chapter: v })}
            />
            <SelectFilter
              label="Tag"
              value={filters.tag}
              options={tags}
              placeholder="All tags"
              onChange={(v) => update({ tag: v })}
            />
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                className="mb-0 border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
