"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error?: string;
  needsEmailConfirmation?: boolean;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "workspace"
  );
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // why: Supabase can be configured to require email confirmation before a session exists. Without
  // a live project to configure, we handle both outcomes rather than assuming one.
  if (!data.session) {
    return { needsEmailConfirmation: true };
  }

  redirect("/app/inbox");
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/app/inbox");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkspace(formData: FormData): Promise<AuthActionResult> {
  const workspaceName = String(formData.get("workspaceName") || "").trim();
  if (!workspaceName) {
    return { error: "Workspace name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const slug = `${slugify(workspaceName)}-${user.id.slice(0, 6)}`;
  const { error } = await supabase.rpc("create_workspace_with_owner", {
    workspace_name: workspaceName,
    workspace_slug: slug,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/app/inbox");
}
