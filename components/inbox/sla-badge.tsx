"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { computeSlaStatus, worstSlaState, type SlaConversationFields } from "@/lib/sla";
import { Badge } from "@/components/ui/badge";
import type { SlaPolicy } from "@/lib/types";

/**
 * Compact SLA indicator: renders nothing while a conversation is inside its targets, an amber
 * "due soon" chip in the last 20% of a window, and a red chip once a target is breached.
 */
export function SlaBadge({
  conversation,
  policy,
}: {
  conversation: SlaConversationFields;
  policy: SlaPolicy | null;
}) {
  if (!policy) return null;

  const status = computeSlaStatus(
    conversation,
    {
      firstResponseMinutes: policy.first_response_minutes,
      resolutionMinutes: policy.resolution_minutes,
    },
    new Date(),
  );
  const worst = worstSlaState(status);
  if (!worst) return null;

  if (worst === "breached") {
    return (
      <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 dark:bg-destructive/20">
        <AlertTriangle aria-hidden="true" />
        SLA breached
      </Badge>
    );
  }
  return (
    <Badge className="bg-warning/10 text-warning hover:bg-warning/10 dark:bg-warning/15">
      <Clock aria-hidden="true" />
      SLA due soon
    </Badge>
  );
}
