"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
      <div className={cn("rounded-md border", sending && "opacity-60")}>
        <EditorContent editor={editor} data-placeholder={placeholder} />
      </div>
      <div className="mt-2 flex justify-end">
        <Button onClick={handleSend} disabled={!editor || editor.isEmpty || sending}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
