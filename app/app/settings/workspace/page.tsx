import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { InviteRow } from "@/components/team/invite-row";
import { RequestRow } from "@/components/team/request-row";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { SlaPolicyForm } from "@/components/settings/sla-policy-form";
import type { SlaPolicy, WorkspaceInvite } from "@/lib/types";

export default async function WorkspaceSettingsPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const [{ data: invites }, { data: requests }, { data: slaPolicy }] = await Promise.all([
    supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("list_workspace_requests", { target_workspace_id: context.workspace.id }),
    supabase
      .from("sla_policies")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .maybeSingle(),
  ]);

  const canManage = context.role === "owner" || context.role === "admin";

  return (
    <div className="mx-auto max-w-3xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Workspace Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage outgoing invites and incoming access requests.
        </p>
      </div>

      {invites && invites.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Pending invites</h2>
          <div className="space-y-2">
            {(invites as WorkspaceInvite[]).map((invite) => (
              <InviteRow key={invite.id} invite={invite} canManage={canManage} />
            ))}
          </div>
        </div>
      )}

      {requests && requests.length > 0 && canManage && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Pending Requests</h2>
          <div className="space-y-2">
            {((requests || []) as any[]).map((request: any) => (
              <RequestRow key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {canManage && (
        <div className="rounded-xl border border-border/50 bg-background/50 p-6 shadow-sm">
          <h2 className="text-base font-medium">SLA targets</h2>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            Time limits for the first agent reply and for resolving a conversation, measured from
            when the conversation starts.
          </p>
          <SlaPolicyForm policy={(slaPolicy as SlaPolicy | null) ?? null} />
        </div>
      )}

      {canManage && (
        <div className="rounded-xl border border-border/50 bg-background/50 p-6 shadow-sm">
          <h2 className="text-base font-medium">Invite a teammate</h2>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            No invitation email is sent (descoped). They join automatically the moment
            they sign up with this email address.
          </p>
          <InviteMemberForm />
        </div>
      )}
    </div>
  );
}
