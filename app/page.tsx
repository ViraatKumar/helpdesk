import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Helpdesk</h1>
      <p className="max-w-md text-muted-foreground">
        A unified chat + email support inbox with a searchable knowledge base and AI conversation
        summaries.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants({})}>
          Get started
        </Link>
        <Link href="/demo" className={buttonVariants({ variant: "outline" })}>
          View demo
        </Link>
      </div>
    </div>
  );
}
