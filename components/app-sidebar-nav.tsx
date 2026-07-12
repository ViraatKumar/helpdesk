"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Inbox, Users, Settings, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/app/settings/team", label: "Team", icon: Users },
  { href: "/app/settings/workspace", label: "Workspace Settings", icon: Settings },
  { href: "/workspaces", label: "Workspaces", icon: LayoutGrid },
];

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-0.5 text-[13px]">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", active && "text-primary")}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
