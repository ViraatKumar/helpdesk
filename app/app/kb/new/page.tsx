import { ArticleForm } from "@/components/kb/article-form";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function NewArticlePage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("kb_categories")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  return <ArticleForm categories={categories ?? []} />;
}
