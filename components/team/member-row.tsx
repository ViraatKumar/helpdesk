"use client";

import { useTransition } from "react";
import { updateMemberRole } from "@/lib/actions/team";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MemberRow({
  userId,
  email,
  role,
  isSelf,
  canManage,
}: {
  userId: string;
  email: string;
  role: string;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleRoleChange(newRole: string | null) {
    if (!newRole) return;
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", newRole);
    startTransition(() => {
      updateMemberRole(formData);
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="text-sm">
        {email} {isSelf && <span className="text-muted-foreground">(you)</span>}
      </div>
      {canManage && !isSelf ? (
        <Select defaultValue={role} onValueChange={handleRoleChange} disabled={pending}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm capitalize text-muted-foreground">{role}</span>
      )}
    </div>
  );
}
