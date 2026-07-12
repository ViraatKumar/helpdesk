import { LifeBuoy, LogOut } from "lucide-react";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspaceContext();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border/50 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <LifeBuoy className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold">
              {context.workspace.name}
            </p>
            <p className="text-[11px] capitalize text-muted-foreground">{context.role}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AppSidebarNav />
        </div>
        <div className="border-t border-border/50 p-4">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      <Toaster />
    </div>
  );
}
