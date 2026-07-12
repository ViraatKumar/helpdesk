import Link from "next/link";
import { BookOpen, LifeBuoy, MessagesSquare, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  { icon: MessagesSquare, label: "Unified chat + email inbox" },
  { icon: BookOpen, label: "Searchable knowledge base" },
  { icon: Sparkles, label: "AI summaries & reply drafts" },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4 text-center animate-in fade-in duration-300 motion-reduce:animate-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_60%)]"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <LifeBuoy className="size-5" aria-hidden="true" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Helpdesk</span>
      </div>
      <div className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Customer support, all in one place.
        </h1>
        <p className="mt-4 text-lg text-balance text-muted-foreground">
          A unified chat + email support inbox with a searchable knowledge base and AI conversation
          summaries.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
        <Link href="/demo" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View demo
        </Link>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
