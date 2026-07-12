"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, escapeHtml } from "@/lib/utils";

// Shared rich-text composer for both channels — chat only uses the plain-text extraction, email uses
// both text and HTML (see sendAgentReply). Built once here rather than once per channel; see README
// trade-off ledger for why chat started on a plain textarea and was upgraded to this once email
// needed body_html.
export function ReplyComposer({
  onSend,
  onTyping,
  sending,
  placeholder = "Write a reply…",
  draftContent,
}: {
  onSend: (text: string, html: string) => void;
  onTyping?: () => void;
  sending: boolean;
  placeholder?: string;
  /** AI-generated draft text to inject into the editor — see components/inbox/ai-draft-button.tsx. */
  draftContent?: string | null;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[44px] px-3 py-2",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
    },
    onUpdate: () => onTyping?.(),
  });

  // tiptap v3 doesn't re-render on transactions by default, so reading editor.isEmpty directly in
  // JSX goes stale (the Send button would stay disabled after typing). useEditorState subscribes.
  const isEmpty = useEditorState({ editor, selector: (ctx) => ctx.editor?.isEmpty ?? true }) ?? true;

  const consumedDraftRef = useRef<string | null>(null);
  useEffect(() => {
    if (!editor || !draftContent || draftContent === consumedDraftRef.current) return;
    consumedDraftRef.current = draftContent;
    editor.commands.setContent(
      draftContent
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join(""),
    );
    editor.commands.focus("end");
  }, [editor, draftContent]);

  function handleSend() {
    if (!editor || editor.isEmpty || sending) return;
    const text = editor.getText().trim();
    if (!text) return;
    onSend(text, editor.getHTML());
    editor.commands.clearContent();
  }

  return (
    <div className="border-t p-3">
      <div
        className={cn(
          "relative rounded-md border transition-[opacity,border-color] focus-within:border-ring",
          sending && "opacity-60",
        )}
      >
        {isEmpty && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground"
          >
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} aria-label={placeholder} />
      </div>
      <div className="mt-2 flex justify-end">
        <Button onClick={handleSend} disabled={!editor || isEmpty || sending}>
          {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
