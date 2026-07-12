import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LifeBuoy className="size-4" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Helpdesk</span>
    </Link>
  );
}
