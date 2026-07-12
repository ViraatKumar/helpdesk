import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { ArticleForm } from "@/components/kb/article-form";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("kb_articles")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (!article) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("kb_categories")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  return <ArticleForm article={article} categories={categories ?? []} />;
}
