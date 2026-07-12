// Domain types mirrored from supabase/migrations/0001_core_schema.sql. Kept hand-written rather than
// generated (`supabase gen types`) because this project never gets a linked live project during
// local development — see README trade-off ledger.

export type WorkspaceRole = "owner" | "admin" | "agent";
export type ConversationChannel = "chat" | "email";
export type ConversationStatus = "open" | "closed" | "snoozed";
export type MessageSenderType = "contact" | "agent";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  created_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  email: string | null;
  name: string | null;
  anonymous_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  contact_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  assignee_id: string | null;
  subject: string | null;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string;
  body: string;
  body_html: string | null;
  email_message_id: string | null;
  email_in_reply_to: string | null;
  read_at: string | null;
  created_at: string;
}

export interface KbCategory {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KbArticle {
  id: string;
  workspace_id: string;
  category_id: string | null;
  title: string;
  body_html: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  summary: {
    summary: string;
    sentiment: "positive" | "neutral" | "negative";
    suggested_action: string;
  };
  generated_for_message_at: string;
  created_at: string;
}

export interface CannedResponse {
  id: string;
  workspace_id: string;
  shortcut: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithContact extends Conversation {
  contact: Contact;
}
