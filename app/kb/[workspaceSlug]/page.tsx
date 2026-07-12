import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
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
    <div className="min-h-screen animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <header className="border-b bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_7%,transparent),transparent_70%)] px-6 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">{workspace.name}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">How can we help?</h1>
          <div className="mx-auto mt-6 max-w-lg">
            <KbSearchForm workspaceSlug={workspaceSlug} defaultValue={q ?? ""} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {q?.trim() && (
          <p className="mb-4 text-sm text-muted-foreground">
            {articles.length === 0
              ? `No articles match "${q}".`
              : `${articles.length} result${articles.length === 1 ? "" : "s"} for "${q}"`}
          </p>
        )}
        {articles.length === 0 && !q?.trim() && (
          <p className="text-center text-sm text-muted-foreground">No published articles yet.</p>
        )}
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/kb/${workspaceSlug}/${article.id}`}
              className="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-4 outline-none transition-all hover:border-primary/30 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{article.title}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <p className="mt-14 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="font-medium underline-offset-4 hover:underline">
            Helpdesk
          </Link>
        </p>
      </main>
    </div>
  );
}
