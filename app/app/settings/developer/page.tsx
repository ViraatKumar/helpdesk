import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { DeveloperManager } from "@/components/settings/developer-manager";
import type { ApiKey, Webhook } from "@/lib/types";

export const metadata = { title: "Developer Settings" };

export default async function DeveloperSettingsPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const [apiKeysRes, webhooksRes] = await Promise.all([
    supabase
      .from("api_keys")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("webhooks")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <h1 className="text-xl font-semibold">Developer Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage API Keys and Webhooks for programmatic access.
      </p>
      <div className="mt-8">
        <DeveloperManager
          initialApiKeys={(apiKeysRes.data ?? []) as ApiKey[]}
          initialWebhooks={(webhooksRes.data ?? []) as Webhook[]}
        />
      </div>
    </div>
  );
}
