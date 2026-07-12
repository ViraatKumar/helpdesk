import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) {
    redirect("/app/inbox");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <BrandMark />
      <Card className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
        <CardHeader>
          <CardTitle>Create a workspace</CardTitle>
          <CardDescription>
            You&apos;re signed in but not part of a workspace yet. Create one to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
}
