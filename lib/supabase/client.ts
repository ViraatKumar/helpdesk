import { createBrowserClient } from "@supabase/ssr";

// Browser client — carries the user's session via cookies, subject to RLS. Used in client
// components (widget UI, inbox realtime subscriptions).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
