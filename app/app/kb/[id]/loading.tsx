import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleLoading() {
  return (
    <div className="mx-auto max-w-2xl p-8" aria-busy="true" aria-label="Loading article">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-4 h-9 w-full" />
      <Skeleton className="h-[316px] w-full" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}
