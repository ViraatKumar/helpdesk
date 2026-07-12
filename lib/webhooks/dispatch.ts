import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { buildWebhookSignatureHeaders } from "@/lib/webhooks/sign";
import type { Webhook } from "@/lib/types";

export async function dispatchWebhookEvent(workspaceId: string, eventType: string, data: any) {
  const supabase = createServiceClient();
  
  // Find all active webhooks for this workspace that subscribe to this event type
  // In Postgres, events is an array, we can use the @> operator or just fetch and filter.
  // We'll fetch active webhooks for the workspace and filter in memory to keep it simple,
  // or use the contains operator.
  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("url, secret, events")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .contains("events", [eventType]);

  if (error) {
    console.error("Failed to fetch webhooks for dispatch:", error);
    return;
  }

  if (!webhooks || webhooks.length === 0) return;

  const payload = JSON.stringify({ type: eventType, data });
  const now = new Date();

  // Fire and forget, no awaiting in a map
  webhooks.forEach((webhook: Partial<Webhook>) => {
    if (!webhook.url || !webhook.secret) return;
    const headers = buildWebhookSignatureHeaders(webhook.secret, payload, now);

    fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: payload,
    }).catch((err) => {
      // In a real production system, this would go into a retry queue
      console.error(`Webhook delivery failed to ${webhook.url}:`, err);
    });
  });
}
