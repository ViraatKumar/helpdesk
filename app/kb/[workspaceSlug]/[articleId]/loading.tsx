import { Skeleton } from "@/components/ui/skeleton";

export default function PublicArticleLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16" aria-busy="true" aria-label="Loading article">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-9 w-4/5" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
