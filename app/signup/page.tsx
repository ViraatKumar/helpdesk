import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4">
      <BrandMark />
      <Card className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>Start supporting customers in a couple of minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
