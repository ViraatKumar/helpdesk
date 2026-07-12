import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { CannedManager } from "@/components/canned/canned-manager";
import type { CannedResponse } from "@/lib/types";

export const metadata = { title: "Canned Responses" };

export default async function CannedResponsesPage() {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: responses } = await supabase
    .from("canned_responses")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("shortcut");

  return (
    <div className="mx-auto max-w-2xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <h1 className="text-xl font-semibold">Canned Responses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reusable reply snippets the whole team can insert from the composer with the ⚡ picker.
      </p>
      <div className="mt-8">
        <CannedManager responses={(responses ?? []) as CannedResponse[]} />
      </div>
    </div>
  );
}
