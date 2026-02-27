import Link from "next/link";

interface EmptyStateProps {
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({ filtered = false, onClearFilters }: EmptyStateProps) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center border border-border bg-card">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6.5" stroke="hsl(var(--muted-foreground))" strokeWidth="1.3" />
            <path d="M14 14L17 17" stroke="hsl(var(--muted-foreground))" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M6.5 9h5M9 6.5v5" stroke="hsl(var(--muted-foreground))" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No artifacts match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search, sort, or filter criteria.
          </p>
        </div>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center border-2 border-dashed border-border">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="1" stroke="hsl(var(--muted-foreground))" strokeWidth="1.3" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke="hsl(var(--muted-foreground))" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">No artifacts yet</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Run the pipeline on a Markdown chapter to generate your first set of Q&A artifacts.
        </p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Go to Generator
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M2.5 6.5H10.5M7.5 3.5L10.5 6.5L7.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}
