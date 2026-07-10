"use client";

import { useActionState } from "react";
import { inviteMember, type TeamActionResult } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: TeamActionResult = {};

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(async (_: TeamActionResult, formData: FormData) => {
    return inviteMember(formData);
  }, initialState);

  return (
    <form action={formAction} className="mt-3 flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Input name="email" type="email" placeholder="teammate@company.com" required />
      </div>
      <Select name="role" defaultValue="agent">
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="agent">Agent</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="owner">Owner</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? "Inviting…" : "Invite"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
