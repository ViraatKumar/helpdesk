"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/api/keys";
import { randomBytes } from "node:crypto";

export async function createApiKey(name: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { token, hash, prefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    workspace_id: context.workspace.id,
    name,
    key_hash: hash,
    prefix,
  });

  if (error) {
    return { error: error.message };
  }

  // We return the raw token exactly once. The client must show it to the user.
  return { token };
}

export async function revokeApiKey(id: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function createWebhook(url: string, events: string[]) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  // Generate a random 32-byte hex string for the webhook signing secret
  const secret = `whsec_${randomBytes(32).toString("hex")}`;

  const { error } = await supabase.from("webhooks").insert({
    workspace_id: context.workspace.id,
    url,
    secret,
    events,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function toggleWebhook(id: string, active: boolean) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("webhooks")
    .update({ active })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteWebhook(id: string) {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
