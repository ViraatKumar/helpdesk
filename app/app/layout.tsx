import { requireWorkspaceContext } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspaceContext();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/20 p-4">
        <div className="mb-6 px-2">
          <p className="truncate text-sm font-semibold">{context.workspace.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{context.role}</p>
        </div>
        <AppSidebarNav />
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            Sign out
          </Button>
        </form>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
      <Toaster />
    </div>
  );
}
