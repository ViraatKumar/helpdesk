"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export interface SlaActionResult {
  error?: string;
  saved?: boolean;
}

function parseMinutes(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes <= 0) return NaN as unknown as number;
  return minutes;
}

export async function saveSlaPolicy(formData: FormData): Promise<SlaActionResult> {
  const context = await requireWorkspaceContext();
  const firstResponse = parseMinutes(formData.get("firstResponseMinutes"));
  const resolution = parseMinutes(formData.get("resolutionMinutes"));

  if (Number.isNaN(firstResponse) || Number.isNaN(resolution)) {
    return { error: "Targets must be whole numbers of minutes (leave blank to disable)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sla_policies").upsert({
    workspace_id: context.workspace.id,
    first_response_minutes: firstResponse,
    resolution_minutes: resolution,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/app/settings/workspace");
  revalidatePath("/app/inbox");
  return { saved: true };
}
