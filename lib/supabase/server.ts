import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client — reads the caller's session from cookies, subject to RLS. Used in server
// components, server actions, and route handlers that act "as the logged-in agent."
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // why: setAll is called from a Server Component during render, where cookie writes are
            // a no-op. Middleware (lib/supabase/middleware.ts) refreshes the session instead.
          }
        },
      },
    },
  );
}
