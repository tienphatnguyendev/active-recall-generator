import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export function ArtifactListSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading artifacts">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-border bg-card p-3">
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArtifactDetailSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading artifact">
      <div className="border border-border bg-card p-5">
        <Skeleton className="mb-2 h-3 w-28" />
        <Skeleton className="mb-2 h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="border border-border bg-card p-5">
        <Skeleton className="mb-3 h-3 w-16" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="ml-4 h-3 w-3/4" />
          <Skeleton className="ml-4 h-3 w-2/3" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border bg-card p-4">
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StudyCardSkeleton() {
  return (
    <div className="min-h-56 border border-border bg-card p-6 sm:p-8" aria-label="Loading study card">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="mb-2 h-5 w-full" />
      <Skeleton className="mb-2 h-5 w-4/5" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border bg-card p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="border border-border bg-card p-5">
        <Skeleton className="mb-4 h-3 w-28" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === 0 ? "w-1/3" : "w-16")}
        />
      ))}
    </div>
  );
}
