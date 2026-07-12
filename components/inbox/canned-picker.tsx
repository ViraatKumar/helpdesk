"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { filterCannedResponses, renderCannedResponse } from "@/lib/canned";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CannedResponse } from "@/lib/types";

export function CannedPicker({
  workspaceId,
  variables,
  onInsert,
}: {
  workspaceId: string;
  variables: Record<string, string | undefined>;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [query, setQuery] = useState("");

  // Fetch lazily on first open — most conversations never touch the picker. RLS scopes the
  // query to the agent's workspace; the explicit filter is belt-and-braces.
  useEffect(() => {
    if (!open || loaded) return;
    const supabase = createClient();
    supabase
      .from("canned_responses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("shortcut")
      .then(({ data }) => {
        setResponses((data ?? []) as CannedResponse[]);
        setLoaded(true);
      });
  }, [open, loaded, workspaceId]);

  const filtered = useMemo(() => filterCannedResponses(responses, query), [responses, query]);

  function insert(response: CannedResponse) {
    onInsert(renderCannedResponse(response.body, variables));
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        aria-label="Insert canned response"
      >
        <Zap aria-hidden="true" />
        Canned
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by /shortcut or title…"
          aria-label="Search canned responses"
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              insert(filtered[0]);
            }
          }}
        />
        <div className="mt-1 max-h-64 overflow-y-auto" role="listbox" aria-label="Canned responses">
          {!loaded && <p className="p-2 text-xs text-muted-foreground">Loading…</p>}
          {loaded && filtered.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">
              {responses.length === 0
                ? "No canned responses yet — create them in Settings → Canned Responses."
                : "No matches."}
            </p>
          )}
          {filtered.map((response) => (
            <button
              key={response.id}
              role="option"
              aria-selected="false"
              onClick={() => insert(response)}
              className="block w-full cursor-pointer rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary">/{response.shortcut}</span>
                <span className="truncate text-sm font-medium">{response.title}</span>
              </span>
              <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {response.body}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
