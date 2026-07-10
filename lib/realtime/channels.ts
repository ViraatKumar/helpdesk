// Channel naming is the only "protocol" between the widget, the inbox, and the server routes that
// broadcast into them. Centralized here so every caller derives the same name from an id instead of
// hand-formatting strings that can drift.

export function conversationChannelName(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function workspaceChannelName(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

export type ConversationBroadcastEvent =
  | { type: "new_message"; payload: { id: string; conversation_id: string } }
  | { type: "typing"; payload: { from: "contact" | "agent" } }
  | { type: "read_receipt"; payload: { message_ids: string[] } };

export type WorkspaceBroadcastEvent = {
  type: "conversation_updated";
  payload: { conversation_id: string };
};
