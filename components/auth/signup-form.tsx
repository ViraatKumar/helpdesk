"use client";

import { useActionState } from "react";
import { signUp, type AuthActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionResult = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(async (_: AuthActionResult, formData: FormData) => {
    return signUp(formData);
  }, initialState);

  if (state?.needsEmailConfirmation) {
    return (
      <p className="text-sm text-muted-foreground">
        Check your email to confirm your account, then sign in.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create workspace"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Already invited to a workspace? Sign up with the email your admin invited — you&apos;ll join
        that workspace automatically instead of creating a new one.
      </p>
    </form>
  );
}
