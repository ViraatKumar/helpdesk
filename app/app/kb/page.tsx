import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export default async function KbAdminPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("kb_articles")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Published articles are visible at{" "}
            <Link href={`/kb/${context.workspace.slug}`} className="underline">
              /kb/{context.workspace.slug}
            </Link>
            .
          </p>
        </div>
        <Link href="/app/kb/new" className={buttonVariants({})}>
          New article
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {(articles ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No articles yet.</p>
        )}
        {(articles ?? []).map((article) => (
          <Link
            key={article.id}
            href={`/app/kb/${article.id}`}
            className="flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate font-medium">{article.title || "Untitled"}</span>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={article.published ? "default" : "secondary"}>
                {article.published ? "Published" : "Draft"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
