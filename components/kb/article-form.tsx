"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createArticle, updateArticle, deleteArticle } from "@/lib/actions/kb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { KbArticle } from "@/lib/types";

export function ArticleForm({ article }: { article?: KbArticle }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [published, setPublished] = useState(article?.published ?? false);
  const [saving, setSaving] = useState(false);
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
      const result = await updateArticle(article.id, title, bodyHtml, published);
      if (result.error) setError(result.error);
    } else {
      await createArticle(title, bodyHtml, published);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!article) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;
    await deleteArticle(article.id);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <button onClick={() => router.push("/app/kb")} className="mb-4 text-sm text-muted-foreground hover:underline">
        &larr; Back to Knowledge Base
      </button>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Article title"
        className="mb-4 text-lg font-medium"
      />

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
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
