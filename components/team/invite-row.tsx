"use client";

import { useTransition } from "react";
import { cancelInvite } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import type { WorkspaceInvite } from "@/lib/types";

export function InviteRow({
  invite,
  canManage,
}: {
  invite: WorkspaceInvite;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    const formData = new FormData();
    formData.set("inviteId", invite.id);
    startTransition(() => {
      cancelInvite(formData);
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2">
      <div className="text-sm">
        {invite.email} <span className="text-muted-foreground capitalize">· {invite.role}</span>
      </div>
      {canManage && (
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={pending}>
          Cancel
        </Button>
      )}
    </div>
  );
}
