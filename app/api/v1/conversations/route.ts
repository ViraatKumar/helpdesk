import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { authenticateApiKey } from "@/lib/api/api-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const supabase = createServiceClient();
  let query = supabase
    .from("conversations")
    .select("*, contact:contacts(*)")
    .eq("workspace_id", auth.workspaceId)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: conversations, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations });
}
