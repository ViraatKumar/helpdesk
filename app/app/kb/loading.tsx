import { Skeleton } from "@/components/ui/skeleton";

export default function KbAdminLoading() {
  return (
    <div className="mx-auto max-w-2xl p-8" aria-busy="true" aria-label="Loading knowledge base">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
