import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-border-light/70 dark:bg-border-dark/60 rounded-md",
        className
      )}
    />
  );
}

/**
 * Skeleton loader for table rows (DocumentTable, MetricsTable, UsageTable)
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark overflow-hidden",
        className
      )}
    >
      {/* Table Header */}
      <div className="bg-surface-light dark:bg-border-dark/30 border-b border-border-light dark:border-border-dark p-3.5 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i === 0 ? "w-1/3" : "flex-1")}
          />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border-light dark:divide-border-dark">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 flex items-center gap-4">
            {/* First col with icon + title style */}
            <div className="w-1/3 flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-2.5 w-2/5" />
              </div>
            </div>

            {/* Remaining cols */}
            {Array.from({ length: columns - 1 }).map((_, cIdx) => (
              <div key={cIdx} className="flex-1">
                <Skeleton
                  className={cn(
                    "h-3.5",
                    cIdx === columns - 2 ? "w-16 rounded-full" : "w-3/4"
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for stat and KPI metric cards
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-5 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-surface-dark space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="w-5 h-5 rounded-md" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/**
 * Skeleton loader for chat messages (alternating user and AI bubbles)
 */
export function MessageSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-4">
          {/* User message skeleton (right aligned) */}
          <div className="flex justify-end">
            <div className="max-w-[75%] sm:max-w-[60%] rounded-2xl rounded-br-xs px-4 py-3 bg-black/5 dark:bg-white/10 space-y-2">
              <Skeleton className="h-4 w-48 ml-auto" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>

          {/* Assistant message skeleton (left aligned with bot avatar) */}
          <div className="flex gap-3 justify-start">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-xs px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for chat conversation sidebar
 */
export function SidebarSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="p-2.5 rounded-lg border border-transparent flex items-center gap-2.5"
        >
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for PDF Document viewer
 */
export function PdfViewerSkeleton() {
  return (
    <div className="h-full flex flex-col bg-surface-light dark:bg-bg-dark border-l border-border-light dark:border-border-dark overflow-hidden">
      {/* Viewer toolbar skeleton */}
      <div className="h-12 border-b border-border-light dark:border-border-dark px-3 flex items-center justify-between bg-bg-light dark:bg-surface-dark">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      </div>

      {/* Document page canvas skeleton */}
      <div className="flex-1 overflow-auto p-6 flex justify-center bg-muted-light/10 dark:bg-black/30">
        <div className="w-[595px] min-h-[780px] bg-white dark:bg-surface-dark shadow-md rounded-lg p-10 space-y-6 border border-border-light dark:border-border-dark">
          {/* Header lines */}
          <div className="space-y-3 pb-4 border-b border-border-light dark:border-border-dark">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>

          {/* Paragraph 1 */}
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Paragraph 2 */}
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>

          {/* Simulated chart / table block */}
          <Skeleton className="h-44 w-full rounded-xl" />

          {/* Paragraph 3 */}
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full page layout skeleton for route Suspense fallbacks
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-bg-light dark:bg-bg-dark">
      {/* Top Navbar Skeleton */}
      <header className="h-14 border-b border-border-light dark:border-border-dark px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <TableSkeleton rows={4} columns={4} />
      </main>
    </div>
  );
}
