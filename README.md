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

_Filled in during Slice 8 once there's a live URL — see that section of this README for the
step-by-step reviewer flow (signup → widget chat → inbox → email thread → reply → KB search →
summarize)._

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
(`supabase/migrations/0005_rls_policies.sql`), checked on every read and write. Two paths bypass RLS
deliberately, both server-only: the widget message-send route (anonymous contacts have no Supabase
session) and the inbound email webhook (no session at all) — both use the service-role key, which
never reaches the client.

## Trade-off Ledger

Every non-obvious decision, logged at the moment it's made — not reconstructed after the fact.

| Decision | Alternative rejected | Why |
|---|---|---|
| Next.js 16.2 instead of pinning to 14 | Force-install `next@14` | Spec says "14+"; `create-next-app@latest` pulled 16.2, which is a strict superset of the App Router APIs this project uses (no deprecated API touched). Re-pinning down to 14 would cost time for zero functional benefit. |
| Codebase built locally without live Supabase/Vercel/Resend/Anthropic accounts | Stop and wait for credentials before writing any code | The account creation and CLI login are the user's to do (see Deployment section). Blocking all code on that would waste the code-writing time available. Everything downstream of "you have accounts" is fully scripted (migrations, seed, deploy steps) so going live is a mechanical follow-up, not a design task. |
| Polymorphic `messages.sender_id` (contact or agent) with no FK, validated at the server-route trust boundary | A nullable FK to both `contacts` and `auth.users`, enforced by a trigger | Postgres has no native polymorphic FK. A trigger to fake one adds a second source of truth for a check the API layer already performs (sender_type is set by the server route, never the client). |
| `is_workspace_member()` as a `security definer` SQL function | Inline `workspace_id in (select ... from workspace_members where user_id = auth.uid())` in every policy | Same logic duplicated across 8 policies invites drift. A single function is also immune to the classic RLS self-recursion bug where a policy on `workspace_members` queries `workspace_members`. |
| `workspace_invites` = pending row keyed by email, linked by a trigger on `auth.users` insert | Send an actual invitation email via Resend | Invitation emails are a named descope (see Hard Don'ts in the spec). The trigger-link approach still produces correct RBAC state for a pre-authorized teammate — it just requires them to already know to sign up with that email, which is a reasonable ask for a 48-hour build. |
| Postgres full-text search (`tsvector` + GIN index) for KB search | External search service (Algolia, Meilisearch, Elasticsearch) | Zero extra infra, one migration, ranked results via `ts_rank`. Adequate at KB-article scale; would not be the right call at 100k+ articles. |
| AI summary cache keyed on `generated_for_message_at` | Time-based TTL (e.g. "regenerate every 10 minutes") | Correctness should track conversation activity, not wall-clock time. A summary goes stale exactly when a new message arrives — never sooner (wasted API cost), never later (stale summary shown as current). |
| Custom domains: wildcard `{slug}.<domain>` for public KB only | Full self-serve custom domains (CNAME → TXT verify → cert issuance → host-header routing) | Cert provisioning and DNS verification UX is a multi-day feature on its own; descoped in favor of the 7 mandatory features. See the Slice 7 section below for the full design if built out. |

## Descoped (explicitly, per spec "Hard Don'ts")

Invitation emails, file attachments, notification emails, analytics, SLA tracking, outbound
webhooks, multi-language KB, full self-serve custom domains. Each is a deliberate scope cut for a
48-hour budget, not an oversight.

## With one more week

_Filled in during Slice 8._
