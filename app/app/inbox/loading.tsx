import { Skeleton } from "@/components/ui/skeleton";
import { ConversationDetailSkeleton } from "@/components/inbox/conversation-detail-skeleton";

export default function InboxLoading() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading inbox">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <Skeleton className="h-5 w-14" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-hidden border-r">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 border-b px-3 py-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
