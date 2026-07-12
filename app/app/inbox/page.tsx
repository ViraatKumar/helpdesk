import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { InboxShell } from "@/components/inbox/inbox-shell";
import type { ConversationWithContact, SlaPolicy } from "@/lib/types";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireWorkspaceContext();
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("conversations")
    .select("*, contact:contacts(*)")
    .eq("workspace_id", context.workspace.id)
    .order("last_message_at", { ascending: false });

  const status = params.status ?? "open";
  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (params.channel) {
    query = query.eq("channel", params.channel);
  }
  if (params.assignee === "unassigned") {
    query = query.is("assignee_id", null);
  } else if (params.assignee === "mine") {
    query = query.eq("assignee_id", context.userId);
  } else if (params.assignee) {
    query = query.eq("assignee_id", params.assignee);
  }

  const { data: conversations } = await query;

  const [{ data: members }, { data: slaPolicy }] = await Promise.all([
    supabase.rpc("list_workspace_members", { target_workspace_id: context.workspace.id }),
    supabase.from("sla_policies").select("*").eq("workspace_id", context.workspace.id).maybeSingle(),
  ]);

  return (
    <InboxShell
      workspaceId={context.workspace.id}
      workspaceName={context.workspace.name}
      currentUserId={context.userId}
      conversations={(conversations ?? []) as ConversationWithContact[]}
      members={(members ?? []) as { user_id: string; email: string }[]}
      slaPolicy={(slaPolicy as SlaPolicy | null) ?? null}
      filters={{
        status,
        channel: params.channel ?? "all",
        assignee: params.assignee ?? "all",
      }}
    />
  );
}
