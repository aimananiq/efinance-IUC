import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminEmail } from "@/lib/iuc-auth";
import { IucLogo } from "@/components/iuc/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login/admin")({
  head: () => ({ meta: [{ title: "Admin Login — IUC E-Finance" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail(username), password });
    setLoading(false);
    if (error) return toast.error("Invalid credentials");
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
      <div className="w-full max-w-md bg-card rounded-xl p-8 border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-center mb-6"><IucLogo className="h-14" /></div>
        <h1 className="text-2xl font-semibold text-center mb-1">Admin Portal</h1>
        <p className="text-sm text-[var(--slate-text)] text-center mb-8">Finance administrator access</p>
        <form onSubmit={submit} className="space-y-5">
          <div><Label htmlFor="u">Username</Label><Input id="u" required value={username} onChange={(e) => setU(e.target.value)} placeholder="admin" className="h-11 mt-2" /></div>
          <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required value={password} onChange={(e) => setP(e.target.value)} className="h-11 mt-2" /></div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]">{loading ? "Signing in…" : "Sign In"}</Button>
        </form>
        <p className="text-xs text-center mt-6 text-[var(--slate-text)]">Student? <Link to="/login/student" className="text-[var(--primary-accent)] font-semibold">Student login</Link></p>
      </div>
    </div>
  );
}