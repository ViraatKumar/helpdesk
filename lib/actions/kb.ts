"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export interface KbActionResult {
  error?: string;
}

export async function createArticle(title: string, bodyHtml: string, published: boolean, categoryId?: string | null) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kb_articles")
    .insert({ workspace_id: context.workspace.id, title, body_html: bodyHtml, published, category_id: categoryId || null })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create article." };
  }

  redirect(`/app/kb`);
}

export async function updateArticle(
  id: string,
  title: string,
  bodyHtml: string,
  published: boolean,
  categoryId?: string | null
): Promise<KbActionResult> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kb_articles")
    .update({ title, body_html: bodyHtml, published, category_id: categoryId || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }
  
  redirect("/app/kb");
}

export async function deleteArticle(id: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  await supabase.from("kb_articles").delete().eq("id", id).eq("workspace_id", context.workspace.id);
  redirect("/app/kb");
}

export async function createCategory(name: string, description?: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kb_categories")
    .insert({ workspace_id: context.workspace.id, name, description: description || null });

  if (error) {
    return { error: error.message };
  }
  redirect("/app/kb");
}

export async function updateCategory(id: string, name: string, description?: string): Promise<KbActionResult> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("kb_categories")
    .update({ name, description: description || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function deleteCategory(id: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  await supabase.from("kb_categories").delete().eq("id", id).eq("workspace_id", context.workspace.id);
  redirect("/app/kb");
}
