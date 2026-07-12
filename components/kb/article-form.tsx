"use client";

import { useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createArticle, updateArticle, deleteArticle } from "@/lib/actions/kb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { KbArticle, KbCategory } from "@/lib/types";

export function ArticleForm({ article, categories = [] }: { article?: KbArticle; categories?: KbCategory[] }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [categoryId, setCategoryId] = useState(article?.category_id ?? "");
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: article?.body_html ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-3 py-2" },
    },
  });

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    setError(null);
    const bodyHtml = editor.getHTML();

    if (article) {
      const result = await updateArticle(article.id, title, bodyHtml, published, categoryId || null);
      if (result.error) setError(result.error);
    } else {
      await createArticle(title, bodyHtml, published, categoryId || null);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!article) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteArticle(article.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8 animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
      <Link
        href="/app/kb"
        className="mb-4 inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        &larr; Back to Knowledge Base
      </Link>

      <div className="mb-4 flex gap-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          className="flex-1 text-lg font-medium"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">No Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border">
        <EditorContent editor={editor} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="published">Published</Label>
        </div>
        <div className="flex gap-2">
          {article && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving || deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || deleting || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
