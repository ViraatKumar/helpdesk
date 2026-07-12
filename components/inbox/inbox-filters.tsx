"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InboxFilters({
  filters,
  members,
}: {
  filters: { status: string; channel: string; assignee: string };
  members: { user_id: string; email: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("c");
    // The transition keeps the current list visible while the filtered query runs; isPending
    // drives the spinner so the change never feels ignored.
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2 border-b p-3" aria-busy={isPending}>
      <Select value={filters.status} onValueChange={(v) => v && setFilter("status", v)}>
        <SelectTrigger className="w-32" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="snoozed">Snoozed</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.channel} onValueChange={(v) => v && setFilter("channel", v)}>
        <SelectTrigger className="w-32" aria-label="Filter by channel">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All channels</SelectItem>
          <SelectItem value="chat">Chat</SelectItem>
          <SelectItem value="email">Email</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assignee} onValueChange={(v) => v && setFilter("assignee", v)}>
        <SelectTrigger className="w-40" aria-label="Filter by assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          <SelectItem value="mine">Assigned to me</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && (
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-label="Updating conversations"
          role="status"
        />
      )}
    </div>
  );
}
