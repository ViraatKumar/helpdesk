import { createServiceClient } from "@/lib/supabase/service";
import { ChatWidget } from "@/components/widget/chat-widget";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = createServiceClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        This chat isn&apos;t set up yet — unknown workspace &quot;{workspaceSlug}&quot;.
      </div>
    );
  }

  return <ChatWidget workspaceSlug={workspace.slug} workspaceName={workspace.name} />;
}
