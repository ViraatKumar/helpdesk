"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approveRequest, rejectRequest } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceRole } from "@/lib/types";
import { useState } from "react";

interface RequestRowProps {
  request: {
    id: string;
    user_id: string;
    email: string;
    created_at: string;
  };
}

export function RequestRow({ request }: RequestRowProps) {
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<WorkspaceRole>("agent");

  function handleApprove() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("requestId", request.id);
      formData.append("role", role);

      const { error } = await approveRequest(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Request approved");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("requestId", request.id);

      const { error } = await rejectRequest(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Request rejected");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{request.email}</p>
        <p className="text-xs text-muted-foreground">Requested access</p>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={role}
          onValueChange={(val) => setRole(val as WorkspaceRole)}
          disabled={isPending}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReject}
          disabled={isPending}
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isPending}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}
