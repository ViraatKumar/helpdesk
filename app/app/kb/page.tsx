import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CreateCategoryDialog } from "@/components/kb/create-category-dialog";
import type { KbCategory } from "@/lib/types";

export default async function KbAdminPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("kb_articles")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("updated_at", { ascending: false });

  const { data: categoriesData } = await supabase
    .from("kb_categories")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  const categories = categoriesData as KbCategory[] ?? [];

  return (
    <div className="mx-auto max-w-3xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
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
        <div className="flex gap-2">
          <CreateCategoryDialog />
          <Link href="/app/kb/new" className={buttonVariants({})}>
            New article
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {(articles ?? []).length === 0 && categories.length === 0 && (
          <p className="text-sm text-muted-foreground">No articles or categories yet.</p>
        )}

        {categories.map((category) => {
          const catArticles = (articles ?? []).filter((a) => a.category_id === category.id);
          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">{category.name}</h2>
              </div>
              {catArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground">No articles in this category.</p>
              ) : (
                <div className="space-y-2">
                  {catArticles.map((article) => (
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
              )}
            </div>
          );
        })}

        {/* Uncategorized articles */}
        {(() => {
          const uncategorized = (articles ?? []).filter((a) => !a.category_id);
          if (uncategorized.length === 0 && categories.length > 0) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">
                {categories.length > 0 ? "Uncategorized" : "All Articles"}
              </h2>
              <div className="space-y-2">
                {uncategorized.map((article) => (
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
        })()}
      </div>
    </div>
  );
}
