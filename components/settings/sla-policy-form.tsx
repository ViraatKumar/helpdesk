"use client";

import { useActionState } from "react";
import { saveSlaPolicy, type SlaActionResult } from "@/lib/actions/sla";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SlaPolicy } from "@/lib/types";

const initialState: SlaActionResult = {};

export function SlaPolicyForm({ policy }: { policy: SlaPolicy | null }) {
  const [state, formAction, pending] = useActionState(
    async (_: SlaActionResult, formData: FormData) => saveSlaPolicy(formData),
    initialState,
  );

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="firstResponseMinutes">First response (minutes)</Label>
          <Input
            id="firstResponseMinutes"
            name="firstResponseMinutes"
            type="number"
            min={1}
            placeholder="e.g. 60"
            defaultValue={policy?.first_response_minutes ?? ""}
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="resolutionMinutes">Resolution (minutes)</Label>
          <Input
            id="resolutionMinutes"
            name="resolutionMinutes"
            type="number"
            min={1}
            placeholder="e.g. 480"
            defaultValue={policy?.resolution_minutes ?? ""}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Conversations show an amber chip in the last 20% of a window and a red chip once a target
        is missed. Leave a field blank to disable that target.
      </p>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.saved && !state.error && <p className="text-sm text-success">SLA targets saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save SLA targets"}
      </Button>
    </form>
  );
}
