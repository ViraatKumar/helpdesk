import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-2xl p-8" aria-busy="true" aria-label="Loading team settings">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
