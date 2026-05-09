import { Skeleton } from "@/components/ui/skeleton";

export default function CommissionsLoading() {
  return (
    <div className="space-y-6 p-1">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Filters */}
      <Skeleton className="h-10 w-64" />

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="flex gap-4 border-b p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b p-4 last:border-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
