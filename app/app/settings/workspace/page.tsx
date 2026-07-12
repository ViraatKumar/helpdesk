import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { InviteRow } from "@/components/team/invite-row";
import { RequestRow } from "@/components/team/request-row";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import type { WorkspaceInvite } from "@/lib/types";

export default async function WorkspaceSettingsPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const [{ data: invites }, { data: requests }] = await Promise.all([
    supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("list_workspace_requests", { target_workspace_id: context.workspace.id }),
  ]);

  const canManage = context.role === "owner" || context.role === "admin";

  return (
    <div className="mx-auto max-w-2xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <h1 className="text-xl font-semibold">Workspace Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage outgoing invites and incoming access requests.
      </p>

      {invites && invites.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">Pending invites</h2>
          <div className="mt-2 space-y-2">
            {(invites as WorkspaceInvite[]).map((invite) => (
              <InviteRow key={invite.id} invite={invite} canManage={canManage} />
            ))}
          </div>
        </div>
      )}

      {requests && requests.length > 0 && canManage && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">Pending Requests</h2>
          <div className="mt-2 space-y-2">
            {((requests || []) as any[]).map((request: any) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-sm font-medium">Invite a teammate</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            No invitation email is sent (descoped — see README). They join automatically the moment
            they sign up with this email address.
          </p>
          <InviteMemberForm />
        </div>
      )}
    </div>
  );
}
