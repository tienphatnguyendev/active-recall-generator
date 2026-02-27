import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  // Show at most 5 page numbers
  const visiblePages = (() => {
    if (totalPages <= 5) return pages;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1"
    >
      <PageButton
        label="Previous"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Go to previous page"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </PageButton>

      {visiblePages[0] > 1 && (
        <>
          <PageButton onClick={() => onPageChange(1)} active={page === 1}>1</PageButton>
          {visiblePages[0] > 2 && (
            <span className="px-2 text-xs text-muted-foreground">…</span>
          )}
        </>
      )}

      {visiblePages.map((p) => (
        <PageButton
          key={p}
          onClick={() => onPageChange(p)}
          active={p === page}
          aria-label={`Go to page ${p}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </PageButton>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2 text-xs text-muted-foreground">…</span>
          )}
          <PageButton onClick={() => onPageChange(totalPages)} active={page === totalPages}>
            {totalPages}
          </PageButton>
        </>
      )}

      <PageButton
        label="Next"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Go to next page"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  active,
  disabled,
  label,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-current={ariaCurrent}
      className={cn(
        "flex h-7 min-w-7 items-center justify-center border px-2 font-mono text-xs font-medium transition-colors disabled:opacity-40",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
