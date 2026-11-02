import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";

export function OutsidePaymentLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage(""); setBusy(true);
    try {
      const credentials = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8, "Password must have at least 8 characters").max(128) }).parse({ email, password });
      if (register) {
        const { data, error } = await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/payment` } });
        if (error) throw error;
        if (data.session) onSignedIn();
        else setMessage("Check your email to confirm your account, then sign in here.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw new Error("Unable to sign in. Check your email and password, and confirm your email first.");
        onSignedIn();
      }
    } catch (error) { setMessage(error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your details" : error instanceof Error ? error.message : "Please try again"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto w-full max-w-md rounded-lg border bg-card p-6 shadow-card">
    <h2 className="text-xl font-semibold">{register ? "Create a payment account" : "Payment account sign in"}</h2>
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div><Label htmlFor="payer-email">Email</Label><Input id="payer-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11" /></div>
      <div><Label htmlFor="payer-password">Password</Label><Input id="payer-password" type="password" autoComplete={register ? "new-password" : "current-password"} required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11" /></div>
      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
      <Button className="w-full h-11" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</Button>
      <Button type="button" variant="ghost" className="w-full" onClick={() => { setRegister(!register); setMessage(""); }}>{register ? "Already have an account? Sign in" : "Create an account"}</Button>
    </form>
  </div>;
}