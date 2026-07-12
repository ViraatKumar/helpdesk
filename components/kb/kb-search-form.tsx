"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SEARCH_DEBOUNCE_MS = 350;

export function KbSearchForm({
  workspaceSlug,
  defaultValue,
}: {
  workspaceSlug: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Each keystroke hits the server-side full-text search, so navigation is debounced; the
  // transition keeps the current results on screen (with a pending spinner) instead of flashing
  // the route's loading fallback mid-typing.
  function navigate(query: string, replace: boolean) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const url = `/kb/${workspaceSlug}${params.size ? `?${params}` : ""}`;
    startTransition(() => {
      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url);
      }
    });
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(next, true), SEARCH_DEBOUNCE_MS);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        navigate(value, false);
      }}
      className="flex gap-2"
    >
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search articles…"
        aria-label="Search articles"
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Search aria-hidden="true" />
        )}
        Search
      </Button>
    </form>
  );
}
