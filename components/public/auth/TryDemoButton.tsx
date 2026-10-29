"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TryDemoButton({ role }: { role: "citizen" | "officer" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function enter() {
    if (pending) return;
    setPending(true); setError("");
    try {
      // Auth.js handles CSRF and the real HttpOnly session cookie. No password,
      // email, account ID or client-supplied authorization accompanies this request.
      const result = await signIn("demo-account", { role, redirect: false });
      if (!result || result.error) throw new Error("Demo unavailable");
      window.location.assign(role === "citizen" ? "/dashboard" : "/officer/overview");
    } catch {
      setError("The demo is currently unavailable. Please try again later.");
      setPending(false);
    }
  }
  return <div className="space-y-2">
    <Button type="button" variant="outline" className="ap-button ap-button-demo w-full" disabled={pending} onClick={enter}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="size-4" aria-hidden="true" />}
      {pending ? "Opening demo..." : role === "citizen" ? "Try Citizen Demo" : "Try Officer Demo"}
    </Button>
    <p className="text-center text-xs text-muted-foreground">Explore with synthetic data. No account creation needed.</p>
    {error && <p role="alert" className="ap-form-notice ap-form-notice--error">{error}</p>}
  </div>;
}
