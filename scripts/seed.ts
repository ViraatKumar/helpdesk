// Seeds a realistic demo workspace: 2 agents, a handful of contacts, ~10 conversations mixed
// chat/email in varying statuses, and a few published KB articles. Run against a deployed Supabase
// project with `npm run db:seed` (loads .env.local via tsx --env-file).
//
// why a standalone script, not a migration: this is demo data, not schema — it shouldn't run on
// every `supabase db push`, and it needs the auth.admin API (create real login-able users), which
// migrations can't call.
import { createClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "helpdesk-demo-123";
const WORKSPACE_SLUG = "acme";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Run this against a deployed project with .env.local populated.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: existing } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", WORKSPACE_SLUG)
    .maybeSingle();
  if (existing) {
    console.log(`Workspace "${WORKSPACE_SLUG}" already exists (${existing.id}) — skipping seed.`);
    return;
  }

  console.log("Creating workspace…");
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: "Acme Rockets", slug: WORKSPACE_SLUG })
    .select("id")
    .single();
  if (workspaceError || !workspace) throw workspaceError;

  console.log("Creating agent accounts…");
  const agents = [
    { email: "owner@acme.test", role: "owner" as const },
    { email: "agent@acme.test", role: "agent" as const },
  ];
  const agentIds: Record<string, string> = {};

  for (const agent of agents) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: agent.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw error;
    agentIds[agent.email] = created.user.id;

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: created.user.id, role: agent.role });
  }
  const ownerId = agentIds["owner@acme.test"];
  const agentId = agentIds["agent@acme.test"];

  console.log("Creating contacts…");
  const contactSeeds = [
    { name: "Priya Shah", email: "priya@example.com" },
    { name: "Marcus Lee", email: "marcus@example.com" },
    { name: null, email: null, anonymous_id: "seed-anon-1" },
    { name: "Devon Ortiz", email: "devon@example.com" },
    { name: "Jamie Chen", email: "jamie@example.com" },
  ];
  const contacts: { id: string; name: string | null; email: string | null }[] = [];
  for (const c of contactSeeds) {
    const { data, error } = await supabase
      .from("contacts")
      .insert({ workspace_id: workspace.id, ...c })
      .select("id, name, email")
      .single();
    if (error || !data) throw error;
    contacts.push(data);
  }

  console.log("Creating conversations…");
  const now = Date.now();
  const conversationSeeds = [
    {
      contact: contacts[0],
      channel: "email" as const,
      subject: "Order #4821 hasn't shipped",
      status: "open" as const,
      assignee: agentId,
      messages: [
        { sender: "contact", body: "Hi, I ordered a Falcon kit 5 days ago and it still says processing. Can you check?" },
        { sender: "agent", body: "Thanks for flagging this, Priya — looking into it now." },
        { sender: "contact", body: "Appreciate it, let me know what you find." },
      ],
    },
    {
      contact: contacts[1],
      channel: "chat" as const,
      status: "open" as const,
      assignee: null,
      messages: [
        { sender: "contact", body: "does the titan booster fit the falcon kit?" },
      ],
    },
    {
      contact: contacts[2],
      channel: "chat" as const,
      status: "closed" as const,
      assignee: ownerId,
      messages: [
        { sender: "contact", body: "just wanted to say the launch pad kit is awesome" },
        { sender: "agent", body: "That's great to hear! Thanks for letting us know 🚀" },
      ],
    },
    {
      contact: contacts[3],
      channel: "email" as const,
      subject: "Refund request",
      status: "snoozed" as const,
      assignee: agentId,
      messages: [
        { sender: "contact", body: "I'd like a refund for order #4790, the parts arrived damaged." },
        { sender: "agent", body: "Sorry to hear that. Could you send a photo of the damage?" },
      ],
    },
    {
      contact: contacts[4],
      channel: "email" as const,
      subject: "Question about bulk orders",
      status: "open" as const,
      assignee: null,
      messages: [{ sender: "contact", body: "Do you offer discounts for orders of 10+ kits for a school club?" }],
    },
    {
      contact: contacts[0],
      channel: "chat" as const,
      status: "closed" as const,
      assignee: agentId,
      messages: [
        { sender: "contact", body: "how long does shipping usually take?" },
        { sender: "agent", body: "Usually 3-5 business days within the US." },
        { sender: "contact", body: "perfect, thank you!" },
      ],
    },
    {
      contact: contacts[1],
      channel: "email" as const,
      subject: "Missing parts in kit",
      status: "open" as const,
      assignee: ownerId,
      messages: [
        { sender: "contact", body: "My Titan Booster kit was missing the fin set. Order #4655." },
        { sender: "agent", body: "Thanks Marcus, we'll ship a replacement fin set right away." },
      ],
    },
    {
      contact: contacts[2],
      channel: "chat" as const,
      status: "open" as const,
      assignee: null,
      messages: [{ sender: "contact", body: "is there a warranty on the ignition module?" }],
    },
    {
      contact: contacts[3],
      channel: "chat" as const,
      status: "snoozed" as const,
      assignee: agentId,
      messages: [
        { sender: "contact", body: "can I change my shipping address after ordering?" },
        { sender: "agent", body: "Yes, as long as it hasn't shipped yet — what's the order number?" },
      ],
    },
    {
      contact: contacts[4],
      channel: "email" as const,
      subject: "Re: Question about bulk orders",
      status: "closed" as const,
      assignee: ownerId,
      messages: [
        { sender: "contact", body: "Following up on my bulk order question from last week." },
        { sender: "agent", body: "Apologies for the delay — yes, we offer 15% off for 10+ kits. I'll send an invoice." },
        { sender: "contact", body: "Sounds great, thank you!" },
      ],
    },
  ];

  for (const [i, seed] of conversationSeeds.entries()) {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspace.id,
        contact_id: seed.contact.id,
        channel: seed.channel,
        subject: seed.subject ?? null,
        status: seed.status,
        assignee_id: seed.assignee,
      })
      .select("id")
      .single();
    if (convError || !conversation) throw convError;

    for (const [j, message] of seed.messages.entries()) {
      const createdAt = new Date(now - (conversationSeeds.length - i) * 3_600_000 + j * 60_000).toISOString();
      const isAgent = message.sender === "agent";
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_type: message.sender,
        sender_id: isAgent ? (seed.assignee ?? ownerId) : seed.contact.id,
        body: message.body,
        created_at: createdAt,
      });
      if (msgError) throw msgError;
    }
  }

  console.log("Creating KB articles…");
  const articles = [
    {
      title: "How long does shipping take?",
      body_html: "<p>Standard shipping within the US takes 3-5 business days. International orders take 7-14 business days.</p>",
    },
    {
      title: "Returns and refunds policy",
      body_html: "<p>If your kit arrives damaged or with missing parts, contact us within 30 days for a free replacement or full refund.</p>",
    },
    {
      title: "Bulk orders for schools and clubs",
      body_html: "<p>We offer 15% off orders of 10 or more kits. Email us for an invoice and we'll set up a bulk order.</p>",
    },
    {
      title: "Draft: upcoming Titan Booster v2",
      body_html: "<p>Internal notes on the next booster revision — not ready for publication.</p>",
      published: false,
    },
  ];
  for (const article of articles) {
    const { error } = await supabase.from("kb_articles").insert({
      workspace_id: workspace.id,
      title: article.title,
      body_html: article.body_html,
      published: article.published ?? true,
    });
    if (error) throw error;
  }

  console.log("\nDone. Demo workspace:", WORKSPACE_SLUG);
  console.log("Sign in with:");
  for (const agent of agents) console.log(`  ${agent.email} / ${DEMO_PASSWORD} (${agent.role})`);
  console.log(`Widget demo: /demo`);
  console.log(`Public KB: /kb/${WORKSPACE_SLUG}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
