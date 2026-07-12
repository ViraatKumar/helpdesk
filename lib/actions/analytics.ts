"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export interface AnalyticsData {
  totalConversations: number;
  closedConversations: number;
  resolutionRate: number; // percentage
  avgFirstResponseMins: number | null;
  avgResolutionMins: number | null;
  agentLeaderboard: {
    agentId: string;
    agentName: string;
    closedCount: number;
  }[];
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, status, created_at, first_agent_reply_at, closed_at, assignee_id")
    .eq("workspace_id", context.workspace.id);

  if (error || !conversations) {
    throw new Error(error?.message || "Failed to fetch analytics data");
  }

  const totalConversations = conversations.length;
  const closedConversations = conversations.filter((c) => c.status === "closed").length;
  const resolutionRate = totalConversations > 0 ? (closedConversations / totalConversations) * 100 : 0;

  let totalFirstResponseMins = 0;
  let firstResponseCount = 0;

  let totalResolutionMins = 0;
  let resolutionCount = 0;

  const agentScores: Record<string, number> = {};

  for (const conv of conversations) {
    if (conv.first_agent_reply_at) {
      const created = new Date(conv.created_at).getTime();
      const replied = new Date(conv.first_agent_reply_at).getTime();
      totalFirstResponseMins += (replied - created) / 60000;
      firstResponseCount++;
    }

    if (conv.status === "closed" && conv.closed_at) {
      const created = new Date(conv.created_at).getTime();
      const closed = new Date(conv.closed_at).getTime();
      totalResolutionMins += (closed - created) / 60000;
      resolutionCount++;

      if (conv.assignee_id) {
        agentScores[conv.assignee_id] = (agentScores[conv.assignee_id] || 0) + 1;
      }
    }
  }

  const avgFirstResponseMins = firstResponseCount > 0 ? totalFirstResponseMins / firstResponseCount : null;
  const avgResolutionMins = resolutionCount > 0 ? totalResolutionMins / resolutionCount : null;

  // We need to fetch agent names for the leaderboard
  const agentIds = Object.keys(agentScores);
  let agentLeaderboard: AnalyticsData["agentLeaderboard"] = [];

  if (agentIds.length > 0) {
    // using service role or RPC would be better here, but auth.users can't be queried directly from client side
    // in Supabase without a specific view or RPC. We don't have user profiles. 
    // Wait, the members' emails/names might be known. There is a `team_members` view?
    // Let's use an RPC or just leave the ID for now and let the UI handle it.
    // Actually, `supabase/migrations/0007_team_management_rpc.sql` has `get_workspace_members`.
    const { data: members } = await supabase.rpc("get_workspace_members", {
      ws_id: context.workspace.id,
    });

    if (members) {
      agentLeaderboard = agentIds.map((id) => {
        const member = members.find((m: any) => m.user_id === id);
        return {
          agentId: id,
          agentName: member?.email || "Unknown Agent",
          closedCount: agentScores[id],
        };
      });
    }
  }

  agentLeaderboard.sort((a, b) => b.closedCount - a.closedCount);

  return {
    totalConversations,
    closedConversations,
    resolutionRate,
    avgFirstResponseMins,
    avgResolutionMins,
    agentLeaderboard,
  };
}
