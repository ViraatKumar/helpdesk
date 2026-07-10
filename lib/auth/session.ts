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

export type WorkspaceContextLookup =
  | { status: "unauthenticated" }
  | { status: "no_workspace" }
  | { status: "ok"; context: WorkspaceContext };

// Shared core: re-derived from the DB on every call (never trusted from client-passed props), used
// by both the page-facing requireWorkspaceContext (below) and the API-route-facing
// getApiWorkspaceContext (lib/auth/api-session.ts) — they differ only in how they fail (redirect vs.
// JSON error response), not in how they look up "who is this."
// why single-workspace: this build assumes one workspace per user (the common case for a support
// team). A workspace switcher for users in multiple workspaces is a documented "one more week" item.
export async function fetchWorkspaceContext(): Promise<WorkspaceContextLookup> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "unauthenticated" };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.workspaces) return { status: "no_workspace" };

  return {
    status: "ok",
    context: {
      userId: user.id,
      userEmail: user.email!,
      workspace: membership.workspaces as unknown as Workspace,
      role: membership.role as WorkspaceRole,
    },
  };
}

export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const lookup = await fetchWorkspaceContext();
  if (lookup.status === "unauthenticated") {
    redirect("/login");
  }
  if (lookup.status === "no_workspace") {
    redirect("/onboarding");
  }
  return lookup.context;
}

const ROLE_RANK: Record<WorkspaceRole, number> = { agent: 0, admin: 1, owner: 2 };

// why: RLS is the real enforcement, but a clear error here beats a confusing empty-result RLS
// failure surfacing three layers up in a server action.
export function requireRole(context: WorkspaceContext, minRole: WorkspaceRole) {
  if (ROLE_RANK[context.role] < ROLE_RANK[minRole]) {
    throw new Error(`This action requires the '${minRole}' role or higher.`);
  }
}
