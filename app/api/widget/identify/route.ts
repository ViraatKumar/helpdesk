import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  contactId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(200).optional(),
});

// Upgrades an anonymous contact with an email address (optional capture form in the widget). Not an
// auth flow — the contact still isn't a Supabase Auth user, just a more identifiable `contacts` row.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { contactId, email, name } = parsed.data;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("contacts")
    .update({ email, ...(name ? { name } : {}) })
    .eq("id", contactId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
