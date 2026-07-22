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
  head: () => ({ meta: [{ title: "Admin Login — IUC E-Pay IUC" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e?: React.FormEvent | React.MouseEvent) {
    if (e && "preventDefault" in e) e.preventDefault();
    console.log("[admin-login] submit fired", { username, hasPw: !!password });
    setErrorMsg(null);
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setErrorMsg("Please enter both username and password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail(u),
        password: p,
      });
      if (error) {
        console.warn("[admin-login] sign-in error", error);
        const msg = "Invalid username or password.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      console.log("[admin-login] sign-in success, navigating");
      toast.success("Welcome back");
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      console.error("Admin sign-in failed", err);
      setErrorMsg("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
      <div className="w-full max-w-md bg-card rounded-xl p-8 border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-center mb-6"><IucLogo className="h-14" /></div>
        <h1 className="text-2xl font-semibold text-center mb-1">Admin Portal</h1>
        <p className="text-sm text-[var(--slate-text)] text-center mb-8">Finance administrator access</p>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div><Label htmlFor="u">Username</Label><Input id="u" autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} placeholder="admin" className="h-11 mt-2" /></div>
          <div><Label htmlFor="p">Password</Label><Input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} className="h-11 mt-2" /></div>
          {errorMsg && (
            <div role="alert" className="text-sm rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
              {errorMsg}
            </div>
          )}
          <Button type="button" onClick={submit} disabled={loading} className="w-full h-11 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]">{loading ? "Signing in…" : "Sign In"}</Button>
        </form>
        <p className="text-xs text-center mt-6 text-[var(--slate-text)]">Student? <Link to="/login/student" className="text-[var(--primary-accent)] font-semibold">Student login</Link></p>
      </div>
    </div>
  );
}