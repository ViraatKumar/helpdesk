import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const workspaceSlug = searchParams.get("workspaceSlug");

  if (!q || !workspaceSlug) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Call the search RPC
  const { data: articles } = await supabase.rpc("search_kb_articles", {
    target_workspace_id: workspace.id,
    search_query: q.trim(),
  });

  // Limit to top 3
  const topArticles = (articles ?? []).slice(0, 3).map(a => ({
    id: a.id,
    title: a.title,
    // We don't need body for suggestions, just link to it
  }));

  return NextResponse.json({ articles: topArticles });
}
