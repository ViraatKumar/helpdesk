import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "unauthenticated" };

  // Prioritize active workspace from cookie if it exists
  const activeWorkspaceId = cookieStore.get("helpdesk_workspace_id")?.value;
  let membershipQuery = supabase
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  if (activeWorkspaceId) {
    membershipQuery = membershipQuery.eq("workspace_id", activeWorkspaceId);
  }

  const { data: memberships, error: memError } = await membershipQuery;

  // If no membership found for the cookie, fall back to any available membership
  let membership = memberships && memberships.length > 0 ? memberships[0] : null;

  if (!membership && activeWorkspaceId) {
    const { data: fallbackMemberships } = await supabase
      .from("workspace_members")
      .select("role, workspace_id")
      .eq("user_id", user.id)
      .limit(1);
    if (fallbackMemberships && fallbackMemberships.length > 0) {
      membership = fallbackMemberships[0];
    }
  }

  if (!membership) return { status: "no_workspace" };

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  if (!workspace) return { status: "no_workspace" };

  return {
    status: "ok",
    context: {
      userId: user.id,
      userEmail: user.email!,
      workspace: workspace as unknown as Workspace,
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
