"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("c");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 border-b p-3">
      <Select value={filters.status} onValueChange={(v) => v && setFilter("status", v)}>
        <SelectTrigger className="w-32">
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
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All channels</SelectItem>
          <SelectItem value="chat">Chat</SelectItem>
          <SelectItem value="email">Email</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assignee} onValueChange={(v) => v && setFilter("assignee", v)}>
        <SelectTrigger className="w-40">
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
    </div>
  );
}
