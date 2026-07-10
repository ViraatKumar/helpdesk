"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function KbSearchForm({ workspaceSlug, defaultValue }: { workspaceSlug: string; defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (value.trim()) params.set("q", value.trim());
        router.push(`/kb/${workspaceSlug}${params.toString() ? `?${params}` : ""}`);
      }}
      className="flex gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles…"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
