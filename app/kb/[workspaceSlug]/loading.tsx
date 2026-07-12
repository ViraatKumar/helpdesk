import { Skeleton } from "@/components/ui/skeleton";

export default function PublicKbLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16" aria-busy="true" aria-label="Loading help center">
      <Skeleton className="h-9 w-72" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
