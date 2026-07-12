import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { MemberRow } from "@/components/team/member-row";

interface MemberRpcRow {
  user_id: string;
  email: string;
  role: string;
  member_since: string;
}

export default async function TeamSettingsPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: members } = await supabase.rpc("list_workspace_members", {
    target_workspace_id: context.workspace.id,
  });

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
    </div>
  );
}
