"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Full-page skeleton for dashboard-style pages.
 * Shows stat cards + a table area with animated placeholders.
 */
export function PageSkeleton({
  statCount = 4,
  rowCount = 6,
  showTabs = false,
}: {
  statCount?: number;
  rowCount?: number;
  showTabs?: boolean;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" role="status" aria-label="Loading page content">
      <span className="sr-only">Loading page content…</span>
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-skeleton" />
        <Skeleton className="h-4 w-72 bg-skeleton" />
      </div>

      {/* Stat cards skeleton */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-${statCount} gap-3`}
      >
        {[...Array(statCount)].map((_, i) => (
          <Card key={i} className="bg-card border-border-strong">
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              <Skeleton className="h-3 w-20 bg-skeleton" />
              <Skeleton className="h-8 w-16 bg-skeleton" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs skeleton */}
      {showTabs && (
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md bg-skeleton" />
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <Card className="bg-card border-border-strong">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 bg-skeleton" />
            <Skeleton className="h-9 w-40 bg-skeleton" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Table header */}
          <div className="flex gap-4 pb-2 border-b border-border-strong">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-3 bg-skeleton"
                style={{ width: `${80 + ((i * 13) % 60)}px` }}
              />
            ))}
          </div>
          {/* Table rows */}
          {[...Array(rowCount)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              {[...Array(5)].map((_, j) => (
                <Skeleton
                  key={j}
                  className="h-4 bg-skeleton"
                  style={{ width: `${60 + (((i * 17) + (j * 11)) % 80)}px` }}
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact skeleton for detail pages
 */
export function DetailSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" role="status" aria-label="Loading details">
      <span className="sr-only">Loading details…</span>
      {/* Back button */}
      <Skeleton className="h-8 w-24 bg-skeleton" />

      {/* Title area */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg bg-skeleton" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-skeleton" />
          <Skeleton className="h-4 w-32 bg-skeleton" />
        </div>
      </div>

      {/* Sections */}
      {[...Array(sections)].map((_, i) => (
        <Card key={i} className="bg-card border-border-strong">
          <CardHeader>
            <Skeleton className="h-4 w-28 bg-skeleton" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-16 bg-skeleton" />
                  <Skeleton className="h-4 w-28 bg-skeleton" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Inline skeleton row (for inserting into existing content areas)
 */
export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 py-4" role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg bg-skeleton shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton
              className="h-3.5 bg-skeleton"
              style={{ width: `${60 + ((i * 13) % 30)}%` }}
            />
            <Skeleton
              className="h-3 bg-skeleton"
              style={{ width: `${40 + ((i * 17) % 20)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
