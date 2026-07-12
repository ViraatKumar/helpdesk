import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace_id, workspaces(*)")
    .limit(1);
  console.log(JSON.stringify({ data, error }, null, 2));
}
run();
