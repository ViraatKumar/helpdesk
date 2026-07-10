"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export interface KbActionResult {
  error?: string;
}

export async function createArticle(title: string, bodyHtml: string, published: boolean) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kb_articles")
    .insert({ workspace_id: context.workspace.id, title, body_html: bodyHtml, published })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create article." };
  }

  redirect(`/app/kb/${data.id}`);
}

export async function updateArticle(
  id: string,
  title: string,
  bodyHtml: string,
  published: boolean,
): Promise<KbActionResult> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kb_articles")
    .update({ title, body_html: bodyHtml, published, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function deleteArticle(id: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  await supabase.from("kb_articles").delete().eq("id", id).eq("workspace_id", context.workspace.id);
  redirect("/app/kb");
}
