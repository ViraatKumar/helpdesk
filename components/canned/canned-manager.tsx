"use client";

import { useState, useTransition } from "react";
import {
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
} from "@/lib/actions/canned";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CannedResponse } from "@/lib/types";

export function CannedManager({ responses }: { responses: CannedResponse[] }) {
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateCannedResponse(formData)
        : await createCannedResponse(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this canned response?")) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await deleteCannedResponse(formData);
      if (editing?.id === id) setEditing(null);
    });
  }

  return (
    <div className="space-y-8">
      <form key={editing?.id ?? "new"} action={handleSubmit} className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">{editing ? "Edit canned response" : "New canned response"}</p>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="flex gap-2">
          <div className="w-40 space-y-1">
            <Label htmlFor="shortcut">Shortcut</Label>
            <Input
              id="shortcut"
              name="shortcut"
              placeholder="refund"
              defaultValue={editing?.shortcut ?? ""}
              required
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Refund policy"
              defaultValue={editing?.title ?? ""}
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            name="body"
            rows={4}
            placeholder="Hi {{contact_name|there}}, …"
            defaultValue={editing?.body ?? ""}
            required
          />
          <p className="text-xs text-muted-foreground">
            Variables: {"{{contact_name}}"}, {"{{agent_name}}"}, {"{{workspace_name}}"} — add a
            fallback with {"{{contact_name|there}}"}.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {responses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No canned responses yet. Create one above — agents insert them from the composer.
          </p>
        )}
        {responses.map((response) => (
          <div key={response.id} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">/{response.shortcut}</Badge>
                <span className="truncate text-sm font-medium">{response.title}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-muted-foreground">
                {response.body}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(response)} disabled={pending}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(response.id)}
                disabled={pending}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
