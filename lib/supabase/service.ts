import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Only for server routes that legitimately act outside
// any single user's session: the widget message-send route (anonymous contacts have no auth
// session), the inbound email webhook (no session at all), and triggers/functions that need to write
// across workspace boundaries. Never import this into anything that ships to the client.
// why "server-only": makes an accidental client-side import a build error, not a leaked key.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
