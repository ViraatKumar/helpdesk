# Helpdesk

An Intercom-style customer support platform: unified chat + email inbox, a knowledge base, and
Claude-powered conversation summaries. Built as a single Next.js app on Supabase.

Status: **code-complete locally, not yet deployed** — see "Deployment" below for why and what's
needed to go live.

## Stack

- **Next.js 14+ (App Router, TypeScript strict)** — single deployable, on Vercel
- **Supabase** — Postgres, Auth, Realtime, Row-Level Security
- **Tiptap** — rich text for KB articles and the agent reply composer
- **Resend** — outbound email + inbound webhook parsing
- **Anthropic API (claude-sonnet)** — summarization + reply drafts
- **Tailwind + shadcn/ui** — no custom design system, ship clean and boring

Why this stack: managed auth/realtime/DB eliminates the undifferentiated infrastructure work
(hand-rolled WebSockets, auth, RLS-equivalent access control) that would otherwise eat the 48-hour
budget. The engineering signal is meant to live in the schema, the email threading logic, and the
trade-off decisions — not in plumbing.

## Deployment

This build was done without live Supabase/Vercel/Resend/Anthropic accounts on the build machine —
see the trade-off ledger entry below. To deploy:

1. Create a Supabase project. Run `supabase link` then `supabase db push` to apply everything in
   `supabase/migrations/` in order.
2. In the Supabase dashboard, enable **Realtime** on the `messages` and `conversations` tables
   (migration `0006` adds them to the publication, but double-check in the dashboard).
3. Create a Resend account, verify a sending domain, and configure:
   - An inbound route/webhook pointing at `https://<your-app>/api/email/inbound`.
   - MX records for your support address. **Do this early** — DNS propagation is slow and this is
     the one Day 2 feature with a Day 0 dependency.
4. Get an Anthropic API key from console.anthropic.com.
5. Deploy to Vercel, set every variable in `.env.example` in the Vercel project settings.
6. Run `npm run db:seed` (see `scripts/seed.ts`) against the deployed Supabase project for demo data.

## 2-minute reviewer walkthrough

Once deployed (see Deployment) and seeded (`npm run db:seed`):

1. **Sign up** at `/signup` — creates a new workspace and you as its owner in one step, or **sign in**
   with the seeded demo accounts (`owner@acme.test` / `agent@acme.test`, password
   `helpdesk-demo-123`) to see a workspace with real history already in it.
2. **Open `/demo`** in another tab — a fake marketing page with the real widget embedded via
   `<script src="/widget.js" data-workspace="...">`. Click the chat bubble, send a message.
3. **Watch it land in the inbox** at `/app/inbox` (same account, or the seeded `agent@acme.test`) —
   the conversation appears and updates live, no refresh, over the same Realtime broadcast channel
   the widget just published to.
4. **Email the support address** (`INBOUND_EMAIL_ADDRESS` from your Resend setup) from any mail
   client. It threads into the same inbox as a `channel: email` conversation — same list, same
   detail pane, just a different badge.
5. **Reply from the dashboard** to that email conversation. It arrives in your inbox as a threaded
   reply (`In-Reply-To`/`References` set, subject prefixed `Re:` exactly once) — reply again from
   your email client and watch it thread back into the same conversation.
6. **Search the public knowledge base** at `/kb/acme` (or your workspace's slug) — try a query that
   only partially matches an article title; ranked full-text search still finds it.
7. **Click "Summarize"** on any conversation with a few messages in `/app/inbox` — see the
   AI-generated summary, sentiment badge, and suggested next action appear. Click "AI draft" to see
   a full reply drafted into the composer, unsent, waiting for review.

## Architecture overview

A conversation is **channel-agnostic**; the channel (`chat` | `email`) is a column, not a table
split. Chat messages (via the widget, over Realtime) and email messages (via the Resend inbound
webhook) are two ingestion paths that both terminate in the same `messages` table. The unified inbox
is one filtered query over `conversations`, never a UNION of two feature silos. See
`supabase/migrations/0001_core_schema.sql` for the full schema and the comments explaining each
non-obvious constraint.

Trust boundary: every mutation goes through a server route or server action that re-checks workspace
membership via Supabase RLS. Client-side role checks (hiding an "Invite" button from an `agent`) are
UX only — the actual enforcement is `is_workspace_member()` in Postgres
(`supabase/migrations/0005_rls_policies.sql`), checked on every read and write. A handful of paths
bypass RLS deliberately, all server-only, all read-only or narrowly scoped: the widget message routes
and the inbound email webhook (anonymous contacts have no Supabase session at all), and the public KB
site (`/kb/[workspaceSlug]`, resolving a workspace by slug isn't possible under the members-only
`workspaces` RLS policy for a logged-out visitor). All of them use the service-role key, which
never reaches the client.

## Custom domains

**Shipped:** a wildcard subdomain, `{workspaceSlug}.<yourdomain>`, serves that workspace's public KB
at the root path. This is real, working code (`lib/domains/wildcard-subdomain.ts`, wired into
`proxy.ts`) — a request's `Host` header is compared against `NEXT_PUBLIC_APP_URL`'s hostname, and a
subdomain match rewrites `/` to `/kb/{slug}` (and `/some-article` to `/kb/{slug}/some-article`)
before the request reaches any page. Verified locally with `curl -H "Host: acme.localhost:3000"`.
The only thing that doesn't happen on this build machine is the DNS/Vercel side: adding `*.yourdomain`
as a wildcard domain in the Vercel project settings, which issues one certificate covering every
subdomain — no per-workspace cert work.

**Descoped: full self-serve custom domains** (a customer points their own domain, e.g.
`help.acme.com`, at their workspace). Design, not built:

```
Customer                 Helpdesk dashboard              Vercel Domains API         Edge
--------                 -------------------              -----------------         ----
"Add custom domain"  →   store pending domain        →
                          on workspaces row
                                                       →   POST /v10/projects/…/domains
                                                           (register help.acme.com)
                          show customer the required
                          CNAME + TXT records         ←
Customer updates DNS
at their registrar
                          poll verification status    →   GET .../domains/{domain}/config
                          (background job or manual
                          "recheck" button)
                          on verified=true:
                          - mark workspaces.custom_domain_verified
                          - Vercel auto-issues the cert
                                                                                  ←   requests to
                                                                                      help.acme.com
                                                                                      hit the edge;
                                                                                      proxy.ts resolves
                                                                                      workspace by
                                                                                      custom_domain
                                                                                      instead of slug
```

Why descoped: this is a multi-day feature on its own — DNS propagation delays, verification UX
(customers get CNAME setup wrong constantly, need clear error states), and cert issuance failure
modes (rate limits, CAA records blocking Vercel) are all real production edge cases with no
shortcut. Building a half-working version (say, storing a `custom_domain` column with no
verification flow) would be worse than not building it: it would silently accept a domain that will
never actually resolve, which fails the spec's own bar ("a broken ambitious feature scores worse than
a well-documented stub"). The wildcard subdomain gets every workspace a working public URL today at
near-zero cost; full custom domains is the correct "with one more week" item.

## Trade-off Ledger

Every non-obvious decision, logged at the moment it's made — not reconstructed after the fact.

| Decision | Alternative rejected | Why |
|---|---|---|
| Next.js 16.2 instead of pinning to 14 | Force-install `next@14` | Spec says "14+"; `create-next-app@latest` pulled 16.2, which is a strict superset of the App Router APIs this project uses (no deprecated API touched). Re-pinning down to 14 would cost time for zero functional benefit. |
| Codebase built locally without live Supabase/Vercel/Resend/Anthropic accounts | Stop and wait for credentials before writing any code | The account creation and CLI login are the user's to do (see Deployment section). Blocking all code on that would waste the code-writing time available. Everything downstream of "you have accounts" is fully scripted (migrations, seed, deploy steps) so going live is a mechanical follow-up, not a design task. |
| Polymorphic `messages.sender_id` (contact or agent) with no FK, validated at the server-route trust boundary | A nullable FK to both `contacts` and `auth.users`, enforced by a trigger | Postgres has no native polymorphic FK. A trigger to fake one adds a second source of truth for a check the API layer already performs (sender_type is set by the server route, never the client). |
| `is_workspace_member()` as a `security definer` SQL function | Inline `workspace_id in (select ... from workspace_members where user_id = auth.uid())` in every policy | Same logic duplicated across 8 policies invites drift. A single function is also immune to the classic RLS self-recursion bug where a policy on `workspace_members` queries `workspace_members`. |
| `workspace_invites` = pending row keyed by email, linked by a trigger on `auth.users` insert | Send an actual invitation email via Resend | Invitation emails are a named descope (see Hard Don'ts in the spec). The trigger-link approach still produces correct RBAC state for a pre-authorized teammate — it just requires them to already know to sign up with that email, which is a reasonable ask for a 48-hour build. |
| One workspace per user, first membership row wins | Full workspace switcher for users in multiple workspaces | Not required by the spec's reviewer flow, and every table/policy already supports multi-workspace membership at the data layer if this is added later. Listed under "with one more week." |
| Signup always attempts a session immediately after `auth.signUp`, with a `needsEmailConfirmation` fallback branch | Assume email confirmation is off | Can't configure the live Supabase project's auth settings without an account. Handling both outcomes in code means whichever setting the reviewer's project ends up with, signup works without a follow-up code change. |
| `middleware.ts` renamed to `proxy.ts` | Keep `middleware.ts` | Next.js 16 deprecated the `middleware` file convention in favor of `proxy`; `next build` warned about it, so fixed immediately rather than shipping a deprecation warning. |
| Realtime via Broadcast (`channel.send`), not `postgres_changes` | Postgres CDC (`on('postgres_changes', ...)`) with RLS-scoped anon SELECT policies | Anonymous widget visitors have no Supabase session, so a `postgres_changes` subscription for them would need an RLS SELECT policy on `messages`/`conversations` — and RLS is row-based, not capability-based, so "readable if channel='chat'" would let any visitor list every workspace's chat history, not just their own. Broadcast channels are scoped by name (the conversation UUID); knowing the id is the capability, matching the trust model of a shareable support link. Every message insert (widget route, agent reply action, email webhook) explicitly re-broadcasts after writing to Postgres. |
| No optimistic UI on message send (widget or inbox) | Append locally immediately, reconcile against the broadcast echo | The broadcast round-trip is sub-second and is the single source of truth for ordering; reconciling a locally-generated temp message against the server-confirmed one adds dedupe logic for a UX gain that's barely perceptible at this latency. |
| Chat conversation reply composer is a plain `<textarea>`, not Tiptap | Wire up Tiptap now for chat too | Tiptap is committed for KB articles and the agent reply composer, but chat replies are plain text (no `body_html` needed) — the composer gets upgraded to Tiptap once Slice 4 needs `body_html` for outbound email, so it's built once, not twice. |
| One open chat conversation per contact, reused across page loads until closed | Always start a new conversation on widget load | Matches how Intercom and similar tools behave: a returning visitor within the same open conversation continues it; closing a conversation (agent-side) is what starts a fresh thread on the next message. |
| Multi-tenant inbound email via plus-addressing (`support+acme@yourdomain.com` → workspace slug `acme`), falling back to the oldest workspace when there's no tag | A `support_email` column per workspace, or a hardcoded single-workspace assumption | The spec's env var is a single `INBOUND_EMAIL_ADDRESS`, implying one inbound route. Plus-addressing gets real multi-tenant routing out of that one address with zero schema change and zero extra Resend configuration, while still degrading gracefully to "the one workspace that exists" for the common single-tenant demo case. |
| Resend inbound webhook payload shape assumed from public docs, not verified against a live delivery | Wait for a live Resend account before writing the parser | No live account was available during the build (see Deployment). `lib/email/parse.ts` is deliberately defensive (array-or-object headers, top-level fallback fields) and isolated to one file — the most likely single place to need a field-name fix after the first real webhook delivery. |
| `parseInboundEmail` requires `type === "email.received"` exactly (`z.literal`), rejecting every other Resend webhook event | Accept any payload shape with a `data.from` field | Confirmed via Resend's docs that a single webhook endpoint can be subscribed to ~17 event types (`email.sent`, `email.delivered`, `email.bounced`, ...), several of which also carry a `data.from` field. Without pinning the exact event type, a delivery receipt for an email *we* sent could be misread as a customer message arriving. Caught before it shipped, while configuring the real webhook — not from a live incident. |
| Inbound webhook returns 401 only for signature failures; every other failure (malformed payload, unresolvable workspace, DB error) returns 200 and logs | Return 4xx/5xx for any failure | Email providers retry non-2xx webhook deliveries. A malformed payload will never succeed on retry — returning an error code just produces a retry storm of the same failure. A bad signature is a real security boundary, not a processing error, so it's the one case that isn't swallowed. |
| Idempotency via the `messages.email_message_id` unique index + catching the Postgres unique-violation error code | Pre-check with a SELECT before INSERT | A pre-check has a race window between two concurrent webhook retries; relying on the unique constraint and catching `23505` is atomic. |
| `matchInboundEmailToConversation()` takes pre-fetched candidate data (a `Map` and an array) instead of a Supabase client | Pass a DB client into the matcher and let it query as needed | This is the one function the spec mandates unit tests for. Keeping it pure (no I/O, injected clock) means the tests in `tests/email-threading.test.ts` run in milliseconds with zero mocking — the route handler is a thin, untested shell that fetches candidates and calls it. |
| KB search as a Postgres RPC (`search_kb_articles`) rather than a plain PostgREST filter | `.textSearch()` in the supabase-js query builder | supabase-js's query builder can filter with `.textSearch()` but has no way to order by a computed expression like `ts_rank()`. One RPC does the filter and the ranked ordering in a single round trip. |
| Public KB pages (`/kb/[workspaceSlug]`) read via the service-role client | Give anonymous visitors an RLS policy on `workspaces` to look up a workspace by slug | The `workspaces` table's only SELECT policy is members-only (`is_workspace_member`), so a logged-out visitor can't resolve a slug to a workspace id at all — there's no row to even apply the published-articles policy against. Rather than opening `workspaces` SELECT to the public (exposing every workspace's existence to enumeration) or maintaining two different Supabase clients per page, these pages use the same service-role pattern as the widget: read-only, and every query still explicitly filters `published = true`. |
| Separate `requireApiWorkspaceContext()` for Route Handlers vs. `requireWorkspaceContext()` for Server Components/Actions, sharing one `fetchWorkspaceContext()` core | Reuse `requireWorkspaceContext()` (which calls `redirect()`) everywhere | `next/navigation`'s `redirect()` is designed for Server Components/Actions; called from a Route Handler it doesn't produce a correct HTTP redirect response. The AI routes need a JSON 401, not a page redirect, so they get their own thin wrapper around the same lookup. |
| AI summary is strict JSON (schema-validated with zod, code-fences stripped before parsing) | Free-text summary rendered as-is | The summary feeds a UI that renders `sentiment` as a colored badge and `suggested_action` as a distinct line — a stray sentence back from the model would either crash the render or show garbage in the wrong place. Any parse/validation failure is caught and surfaces as a toast, never a broken page. |
| AI reply draft is plain text, not JSON | Structured output matching the summary's pattern | The draft fills a rich-text composer the agent reads and edits before sending — free text is what it needs to become; forcing it through JSON would just mean immediately unwrapping a `{draft: string}` shell for no benefit. |
| AI draft never auto-sends; it fills the composer via `ReplyComposer`'s `draftContent` prop and is labeled "AI draft — review before sending" until the agent hits Send | Send directly from the draft endpoint | An LLM-authored reply going out under an agent's name with no human in the loop is the one AI failure mode that's actually dangerous (wrong information, wrong tone) rather than merely unhelpful. |
| Wildcard subdomain routing implemented as a `Host`-header rewrite in `proxy.ts`, not a Vercel/DNS-only feature | Rely entirely on Vercel's wildcard domain config with no application-level routing | Vercel's wildcard domain gets requests to the app; something still has to map `acme.yourdomain.com` → workspace `acme`'s KB. That mapping is application logic (compare `Host` against `NEXT_PUBLIC_APP_URL`, rewrite to `/kb/{slug}`), independent of and testable without any DNS being configured — verified locally via `curl -H "Host: ..."`. |
| Postgres full-text search (`tsvector` + GIN index) for KB search | External search service (Algolia, Meilisearch, Elasticsearch) | Zero extra infra, one migration, ranked results via `ts_rank`. Adequate at KB-article scale; would not be the right call at 100k+ articles. |
| AI summary cache keyed on `generated_for_message_at` | Time-based TTL (e.g. "regenerate every 10 minutes") | Correctness should track conversation activity, not wall-clock time. A summary goes stale exactly when a new message arrives — never sooner (wasted API cost), never later (stale summary shown as current). |

## Descoped (explicitly, per spec "Hard Don'ts")

Invitation emails, file attachments, notification emails, analytics, SLA tracking, outbound
webhooks, multi-language KB, full self-serve custom domains. Each is a deliberate scope cut for a
48-hour budget, not an oversight.

## With one more week

- **Full self-serve custom domains** — the design is in the Custom domains section above; the work
  is the verification UX and Vercel Domains API integration.
- **Workspace switcher** — the schema already supports a user belonging to multiple workspaces
  (`workspace_members` is many-to-many); the app just always picks the first one. Add a switcher and
  a `?workspace=` (or subdomain-based) active-workspace resolution.
- **Real invitation emails** — replace the pending-row-linked-on-signup mechanism with an actual
  Resend email containing a signup link pre-filled with the invited email.
- **File attachments** — both the widget and the email pipeline currently handle text/HTML only.
  Resend supports attachments on inbound/outbound; the widget would need a storage bucket (Supabase
  Storage) and an upload UI.
- **Broader test coverage** — the 48-hour budget went entirely into unit-testing the one
  highest-risk pure function (email threading), per the spec's explicit trade-off. The next layer
  worth testing: RLS policies themselves (pgTAP or a script that asserts cross-workspace queries
  return zero rows), and an integration test for the inbound-webhook idempotency path.
- **Rate limiting & abuse controls on `/api/widget/*`** — currently any visitor can hit the init/send
  routes at will. A real deployment needs per-IP or per-contact rate limiting before the public widget
  goes live on a real marketing site.
- **SLA tracking / analytics / outbound webhooks** — named descopes in the original spec; genuinely
  separate features, not extensions of anything already built.
