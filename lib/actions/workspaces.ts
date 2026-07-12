"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceActionResult {
  error?: string;
}

export async function requestAccess(workspaceId: string): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("workspace_requests").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function acceptInvite(workspaceId: string): Promise<WorkspaceActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Find the invite
  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("email", user.email)
    .single();

  if (inviteError || !invite) {
    return { error: "Invite not found or already accepted." };
  }

  // Insert into members
  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: invite.role,
  });

  if (memberError) {
    return { error: memberError.message };
  }

  // Delete the invite
  await supabase.from("workspace_invites").delete().eq("id", invite.id);

  return {};
}

export async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set("helpdesk_workspace_id", workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  
  redirect("/app/inbox");
}
