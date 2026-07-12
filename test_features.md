# Helpdesk Features Testing Guide

This guide will walk you through how to manually test each of the core features of the Helpdesk (Intercom Clone).

## 1. Authentication (Auth)
- **How to test**: 
  - Navigate to the application in an incognito window.
  - Attempt to sign up for a new account.
  - Log out and log back in to ensure sessions are persisted.
  - Verify that you are redirected appropriately if you try to access a protected route without logging in.

## 2. Chat Widget
- **How to test**: 
  - Load up a dummy page or the testing environment where the widget script is embedded.
  - Open the widget as an anonymous user and send a message.
  - Verify that a conversation is created on the agent's dashboard.
  - Reply as an agent from the dashboard, and ensure the visitor sees the message in the widget in real-time.
  - Note: The widget has built-in spam protection limiting users to a maximum of 10 conversations per contact and 10 messages per chat.

## 3. Email Channel (Inbound & Outbound)
- **How to test**:
  - **IMPORTANT: Receiving emails for a specific workspace.** We use plus-addressing to route incoming emails to the correct workspace. If your base inbound email address is configured as `support@meleeestau.resend.app`, you must append `+<workspace_slug>` to the local part of the email.
  - For example, if your workspace slug is `acme-corp`, send an test email from your personal inbox to: `support+acme-corp@meleeestau.resend.app`.
  - Check the Unified Inbox for the workspace to ensure the email arrived and created a new conversation.
  - Reply to the email conversation from the Helpdesk interface and verify the original sender receives the reply.

## 4. Unified Inbox
- **How to test**: 
  - Log in to your agent dashboard and navigate to a workspace.
  - Create incoming messages via the Chat Widget and the Email Channel concurrently.
  - Verify that all messages appear in real-time within the same Unified Inbox view, clearly marked with their source channel (Chat vs Email).
  - Test changing conversation statuses (e.g., closing or snoozing a chat) and ensure it updates across the UI.

## 5. Knowledge Base
- **How to test**:
  - Navigate to the Knowledge Base settings in your workspace.
  - Create a new category and add a new article to it.
  - Save and publish the article.
  - Go to the public-facing Knowledge Base URL or search for the article via the Chat Widget, ensuring the new content is visible and formatted correctly.

## 6. AI Summarization
- **How to test**:
  - Open a long conversation in the Unified Inbox that has multiple messages back and forth.
  - Click the "Summarize" (or AI) button on the conversation panel.
  - Verify that the Gemini AI generates a concise and accurate summary of the customer's issue and the agent's responses.

## 7. Custom Domains
- **How to test**:
  - Go to the Workspace Settings -> Custom Domains.
  - Add a custom domain (e.g., `help.yourdomain.com`).
  - Verify that the system provides DNS records (CNAME/TXT) to configure.
  - Once DNS is mocked or propagated, verify that the public Knowledge Base or Help Center is accessible via that custom domain.

## 8. Webhooks
- **How to test**:
  - Go to the Workspace Settings and add a Webhook URL (e.g., using a service like RequestBin or webhook.site).
  - Perform an action like sending a message in a conversation.
  - Verify that the external webhook URL successfully receives a JSON payload containing the event data (e.g., `message.created`).
