"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-[3px] bg-ink text-paper font-serif text-base">
            L
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Ledger</h1>
          <p className="mt-1 text-sm text-ink-mute">Sign in to your hiring pipeline.</p>
        </div>

        <form action={formAction} className="space-y-4 border border-line bg-paper-raised p-6 rounded-[4px]">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoFocus placeholder="you@company.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>

          {state?.error && (
            <p className="rounded-[3px] bg-flag-soft px-3 py-2 text-[13px] text-flag">{state.error}</p>
          )}

          <Button type="submit" variant="signal" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-ink-mute">
          Accounts are created by your administrator — there's no self-serve sign-up.
        </p>
      </div>
    </div>
  );
}
