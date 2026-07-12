import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { MemberRow } from "@/components/team/member-row";
import { InviteRow } from "@/components/team/invite-row";
import type { WorkspaceInvite } from "@/lib/types";

interface MemberRpcRow {
  user_id: string;
  email: string;
  role: string;
  member_since: string;
}

export default async function TeamSettingsPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.rpc("list_workspace_members", { target_workspace_id: context.workspace.id }),
    supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
  ]);

  const canManage = context.role === "owner" || context.role === "admin";

  return (
    <div className="mx-auto max-w-2xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <h1 className="text-xl font-semibold">Team</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Owners and admins manage the team. Agents have inbox-only access.
      </p>

      <div className="mt-8 space-y-2">
        {((members ?? []) as MemberRpcRow[]).map((member) => (
          <MemberRow
            key={member.user_id}
            userId={member.user_id}
            email={member.email}
            role={member.role}
            isSelf={member.user_id === context.userId}
            canManage={canManage}
          />
        ))}
      </div>

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
