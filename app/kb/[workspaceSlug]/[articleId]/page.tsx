import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function PublicKbArticlePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; articleId: string }>;
}) {
  const { workspaceSlug, articleId } = await params;
  const supabase = createServiceClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) notFound();

  const { data: article } = await supabase
    .from("kb_articles")
    .select("*")
    .eq("id", articleId)
    .eq("workspace_id", workspace.id)
    .eq("published", true)
    .maybeSingle();

  if (!article) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <Link
        href={`/kb/${workspaceSlug}`}
        className="inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        &larr; {workspace.name} Help Center
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{article.title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: article.body_html }}
      />
    </div>
  );
}
