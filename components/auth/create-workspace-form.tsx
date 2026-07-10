"use client";

import { useActionState } from "react";
import { createWorkspace, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionResult = {};

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(async (_: AuthActionResult, formData: FormData) => {
    return createWorkspace(formData);
  }, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workspaceName">Workspace name</Label>
        <Input id="workspaceName" name="workspaceName" placeholder="Acme Support" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
