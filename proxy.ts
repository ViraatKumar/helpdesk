import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rewriteWildcardSubdomain } from "@/lib/domains/wildcard-subdomain";

export async function proxy(request: NextRequest) {
  const wildcardRewrite = rewriteWildcardSubdomain(request);
  if (wildcardRewrite) return wildcardRewrite;

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, so the session cookie stays fresh everywhere,
     * but skip the widget iframe route — it's intentionally unauthenticated (anonymous contacts).
     */
    "/((?!_next/static|_next/image|favicon.ico|widget.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
