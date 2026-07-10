import "server-only";
import { NextResponse } from "next/server";
import { fetchWorkspaceContext, type WorkspaceContext } from "@/lib/auth/session";

// API-route counterpart to requireWorkspaceContext: same lookup, but a route handler needs a JSON
// error response on failure, not a page redirect (next/navigation's redirect() is meant for
// Server Components/Actions and doesn't behave correctly called from a Route Handler).
export async function requireApiWorkspaceContext(): Promise<
  { context: WorkspaceContext } | { error: NextResponse }
> {
  const lookup = await fetchWorkspaceContext();
  if (lookup.status !== "ok") {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  return { context: lookup.context };
}
