import Link from "next/link";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";
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
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link href="/app/inbox" className="rounded-md px-2 py-1.5 hover:bg-muted">
            Inbox
          </Link>
          <Link href="/app/kb" className="rounded-md px-2 py-1.5 hover:bg-muted">
            Knowledge Base
          </Link>
          <Link href="/app/settings/team" className="rounded-md px-2 py-1.5 hover:bg-muted">
            Team
          </Link>
        </nav>
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
