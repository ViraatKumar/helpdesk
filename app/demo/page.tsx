import Script from "next/script";
import { createServiceClient } from "@/lib/supabase/service";

// why force-dynamic: this page reads the first workspace at request time. Without it, Next would
// statically prerender the page at build time — before any workspace exists — and every visitor
// would see the build-time snapshot (permanently "no workspace yet") regardless of what's since
// been created.
export const dynamic = "force-dynamic";

// A fake marketing page with the widget embedded via the actual <script> tag, exactly as a real
// customer would install it — this is the page the reviewer flow points at for "embed the widget."
// why fetch the workspace slug instead of hardcoding one: this page works against whatever workspace
// exists in the connected Supabase project (the seed script or a reviewer's own signup) without
// needing a hardcoded demo tenant.
export default async function DemoPage() {
  const supabase = createServiceClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b px-8 py-5">
        <p className="text-lg font-semibold">Acme Rockets</p>
      </header>
      <main className="mx-auto max-w-3xl px-8 py-24">
        <h1 className="text-4xl font-bold tracking-tight">Rockets, delivered on time.</h1>
        <p className="mt-4 text-lg text-slate-600">
          This is a placeholder marketing page. The chat bubble in the bottom-right corner is the
          real Helpdesk widget, embedded the same way a customer would: a single script tag.
        </p>
        {!workspace && (
          <p className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            No workspace exists yet — sign up at <code>/signup</code> first, then reload this page to
            see the widget.
          </p>
        )}
      </main>

      {workspace && <Script src="/widget.js" data-workspace={workspace.slug} strategy="afterInteractive" />}
    </div>
  );
}
