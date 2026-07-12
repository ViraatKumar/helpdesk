import { Skeleton } from "@/components/ui/skeleton";

export default function PublicKbLoading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Loading help center">
      <div className="border-b px-6 py-14">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-8 w-64" />
          <div className="mt-6 flex w-full max-w-lg gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-2xl space-y-3 px-6 py-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[54px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
