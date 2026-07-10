"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext, requireRole } from "@/lib/auth/session";
import type { WorkspaceRole } from "@/lib/types";

export interface TeamActionResult {
  error?: string;
}

export async function inviteMember(formData: FormData): Promise<TeamActionResult> {
  const context = await requireWorkspaceContext();
  requireRole(context, "admin");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "agent") as WorkspaceRole;

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: context.workspace.id,
    email,
    role,
    invited_by: context.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/settings/team");
  return {};
}

export async function updateMemberRole(formData: FormData): Promise<TeamActionResult> {
  const context = await requireWorkspaceContext();
  requireRole(context, "admin");

  const targetUserId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "") as WorkspaceRole;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", context.workspace.id)
    .eq("user_id", targetUserId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/settings/team");
  return {};
}

export async function cancelInvite(formData: FormData): Promise<TeamActionResult> {
  const context = await requireWorkspaceContext();
  requireRole(context, "admin");

  const inviteId = String(formData.get("inviteId") || "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/settings/team");
  return {};
}
