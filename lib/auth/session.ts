import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole, Workspace } from "@/lib/types";

export interface WorkspaceContext {
  userId: string;
  userEmail: string;
  workspace: Workspace;
  role: WorkspaceRole;
}

// Single source of truth for "who is this agent and which workspace/role are they acting as,"
// re-derived from the DB on every call (never trusted from client-passed props). Used by every
// server action and server component under /app.
// why single-workspace: this build assumes one workspace per user (the common case for a support
// team). A workspace switcher for users in multiple workspaces is a documented "one more week" item.
export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.workspaces) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    userEmail: user.email!,
    workspace: membership.workspaces as unknown as Workspace,
    role: membership.role as WorkspaceRole,
  };
}

const ROLE_RANK: Record<WorkspaceRole, number> = { agent: 0, admin: 1, owner: 2 };

// why: RLS is the real enforcement, but a clear error here beats a confusing empty-result RLS
// failure surfacing three layers up in a server action.
export function requireRole(context: WorkspaceContext, minRole: WorkspaceRole) {
  if (ROLE_RANK[context.role] < ROLE_RANK[minRole]) {
    throw new Error(`This action requires the '${minRole}' role or higher.`);
  }
}
