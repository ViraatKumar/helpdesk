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

export async function approveRequest(formData: FormData): Promise<TeamActionResult> {
  const context = await requireWorkspaceContext();
  requireRole(context, "admin");

  const requestId = String(formData.get("requestId") || "");
  const role = String(formData.get("role") || "agent") as WorkspaceRole;

  const supabase = await createClient();

  // Get the request details first
  const { data: request, error: reqError } = await supabase
    .from("workspace_requests")
    .select("*")
    .eq("id", requestId)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (reqError || !request) {
    return { error: "Request not found." };
  }

  // Update status to approved
  const { error: updateError } = await supabase
    .from("workspace_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Add the user as a member
  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: context.workspace.id,
    user_id: request.user_id,
    role,
  });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/app/settings/team");
  return {};
}

export async function rejectRequest(formData: FormData): Promise<TeamActionResult> {
  const context = await requireWorkspaceContext();
  requireRole(context, "admin");

  const requestId = String(formData.get("requestId") || "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_requests")
    .update({ status: "rejected" })
    .eq("id", requestId)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app/settings/team");
  return {};
}
