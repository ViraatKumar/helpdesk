import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand-mark";
import { WorkspaceCard } from "./workspace-card";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch all workspaces (possible due to new RLS policy)
  const { data: allWorkspaces } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .order("name");

  // 2. Fetch user's current memberships
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  // 3. Fetch user's pending invites
  const { data: invites } = await supabase
    .from("workspace_invites")
    .select("workspace_id, role")
    .eq("email", user.email);

  // 4. Fetch user's pending requests
  const { data: requests } = await supabase
    .from("workspace_requests")
    .select("workspace_id, status")
    .eq("user_id", user.id);

  const workspaces = allWorkspaces || [];
  const memberSet = new Set(memberships?.map((m) => m.workspace_id) || []);
  const inviteSet = new Set(invites?.map((i) => i.workspace_id) || []);
  const requestMap = new Map((requests || []).map((r) => [r.workspace_id, r.status]));

  return (
    <div className="flex min-h-screen flex-col items-center py-12 px-4 bg-muted/40">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <BrandMark />
          <a href="/onboarding" className="text-sm font-medium text-primary hover:underline">
            Create new workspace
          </a>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces Directory</h1>
          <p className="text-muted-foreground mt-2">
            Browse and request access to workspaces within your organization.
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-background">
            <p className="text-muted-foreground">No workspaces found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                isMember={memberSet.has(workspace.id)}
                isInvited={inviteSet.has(workspace.id)}
                requestStatus={requestMap.get(workspace.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
