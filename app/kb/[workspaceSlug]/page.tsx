import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { KbSearchForm } from "@/components/kb/kb-search-form";

export const dynamic = "force-dynamic";

interface SearchResult {
  id: string;
  title: string;
  body_html: string;
  rank: number;
}

export default async function PublicKbPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { q } = await searchParams;
  const supabase = createServiceClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) {
    return <div className="p-8 text-sm text-muted-foreground">Unknown help center.</div>;
  }

  let articles: SearchResult[] = [];
  if (q?.trim()) {
    const { data } = await supabase.rpc("search_kb_articles", {
      target_workspace_id: workspace.id,
      search_query: q.trim(),
    });
    articles = data ?? [];
  } else {
    const { data } = await supabase
      .from("kb_articles")
      .select("id, title, body_html")
      .eq("workspace_id", workspace.id)
      .eq("published", true)
      .order("updated_at", { ascending: false });
    articles = (data ?? []).map((a) => ({ ...a, rank: 0 }));
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">{workspace.name} Help Center</h1>
      <div className="mt-6">
        <KbSearchForm workspaceSlug={workspaceSlug} defaultValue={q ?? ""} />
      </div>

      <div className="mt-8 space-y-3">
        {articles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {q ? `No articles match "${q}".` : "No published articles yet."}
          </p>
        )}
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/kb/${workspaceSlug}/${article.id}`}
            className="block rounded-md border p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <p className="font-medium">{article.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
