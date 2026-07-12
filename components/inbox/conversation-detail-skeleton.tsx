import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the ConversationDetail layout (header / messages / composer) so swapping the real pane in
// doesn't shift anything. Used both while the conversation loads and as the lazy-chunk fallback.
export function ConversationDetailSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden="true">
      <header className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
      </header>
      <div className="border-b p-3">
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="flex-1 space-y-3 overflow-hidden bg-muted/20 p-4">
        <div className="flex justify-start">
          <Skeleton className="h-9 w-3/5 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-2/5 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-14 w-1/2 rounded-2xl" />
        </div>
      </div>
      <div className="border-t p-3">
        <Skeleton className="h-[60px] w-full" />
        <div className="mt-2 flex justify-end">
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
