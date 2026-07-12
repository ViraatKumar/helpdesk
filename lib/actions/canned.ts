"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";

export interface CannedActionResult {
  error?: string;
}

const SHORTCUT_RE = /^[a-z0-9-]{1,32}$/;

function normalizeShortcut(raw: string): string {
  return raw.trim().replace(/^\//, "").toLowerCase();
}

export async function createCannedResponse(formData: FormData): Promise<CannedActionResult> {
  const context = await requireWorkspaceContext();
  const shortcut = normalizeShortcut(String(formData.get("shortcut") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!SHORTCUT_RE.test(shortcut)) {
    return { error: "Shortcut must be 1–32 characters: lowercase letters, numbers, dashes." };
  }
  if (!title || !body) {
    return { error: "Title and body are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("canned_responses").insert({
    workspace_id: context.workspace.id,
    shortcut,
    title,
    body,
    created_by: context.userId,
  });

  if (error) {
    return {
      error: error.code === "23505" ? `Shortcut "/${shortcut}" is already taken.` : error.message,
    };
  }
  revalidatePath("/app/settings/canned");
  return {};
}

export async function updateCannedResponse(formData: FormData): Promise<CannedActionResult> {
  const context = await requireWorkspaceContext();
  const id = String(formData.get("id") ?? "");
  const shortcut = normalizeShortcut(String(formData.get("shortcut") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!SHORTCUT_RE.test(shortcut)) {
    return { error: "Shortcut must be 1–32 characters: lowercase letters, numbers, dashes." };
  }
  if (!id || !title || !body) {
    return { error: "Title and body are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("canned_responses")
    .update({ shortcut, title, body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return {
      error: error.code === "23505" ? `Shortcut "/${shortcut}" is already taken.` : error.message,
    };
  }
  revalidatePath("/app/settings/canned");
  return {};
}

export async function deleteCannedResponse(formData: FormData): Promise<CannedActionResult> {
  const context = await requireWorkspaceContext();
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("canned_responses")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }
  revalidatePath("/app/settings/canned");
  return {};
}
