"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginAction } from "./actions";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, { error: "" });
  return <form action={action} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="admin-email">Admin email</Label>
      <Input id="admin-email" name="email" type="email" autoComplete="username" required disabled={pending} /></div>
    <div className="space-y-2"><Label htmlFor="admin-password">Password</Label>
      <Input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={pending} /></div>
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? "Signing in..." : "Sign in as Admin"}
    </Button>
  </form>;
}
