import { Skeleton } from "@/components/ui/skeleton";
import { ConversationDetailSkeleton } from "@/components/inbox/conversation-detail-skeleton";

export default function InboxLoading() {
  return (
    <div className="flex h-screen flex-col" aria-busy="true" aria-label="Loading inbox">
      <div className="flex items-center gap-2 border-b p-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-hidden border-r">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 border-b p-3">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-14" />
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
