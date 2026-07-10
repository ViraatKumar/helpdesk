import { NextResponse, type NextRequest } from "next/server";

// Slice 7 (custom domains, rational stub): a wildcard subdomain like acme.yourdomain.com serves that
// workspace's public KB at the root path, via a host-header rewrite — no per-workspace deployment,
// SSL covered by Vercel's single wildcard cert for *.yourdomain.com. Full self-serve custom domains
// (a customer's own domain, e.g. help.acme.com) needs CNAME + TXT verification + Vercel Domains API
// cert issuance; descoped — see README "Custom domains" section for the full design.
export function rewriteWildcardSubdomain(request: NextRequest): NextResponse | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  const baseHost = new URL(appUrl).hostname;
  const requestHost = request.headers.get("host")?.split(":")[0];
  if (!requestHost || requestHost === baseHost) return null;
  if (!requestHost.endsWith(`.${baseHost}`)) return null;

  const subdomain = requestHost.slice(0, -(baseHost.length + 1));
  if (!subdomain || subdomain === "www") return null;

  const url = request.nextUrl.clone();
  url.pathname = `/kb/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}
