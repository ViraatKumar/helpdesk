import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashApiKey } from "@/lib/api/keys";

export async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Missing or invalid authorization header." }, { status: 401 }) };
  }

  const token = authHeader.substring(7).trim();
  const keyHash = hashApiKey(token);

  const supabase = createServiceClient();
  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("workspace_id, revoked_at")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey || apiKey.revoked_at !== null) {
    return { error: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  }

  return { workspaceId: apiKey.workspace_id };
}
