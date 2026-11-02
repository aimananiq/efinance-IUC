import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { studentEmail } from "@/lib/iuc-auth";
import { IucLogo } from "@/components/iuc/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login/student")({
  head: () => ({ meta: [{"title": "Student Login — E-Pay IUC"}, {"name": "description", "content": "Student Login for Innovative University College’s E-Pay portal."}, {"property": "og:title", "content": "Student Login — E-Pay IUC"}, {"property": "og:description", "content": "Student Login for Innovative University College’s E-Pay portal."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
  component: StudentLogin,
});

function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setSid] = useState("");
  const [nric, setNric] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sid = studentId.trim();
    const nricDigits = nric.replace(/[\s-]/g, "");
    if (!sid || !nricDigits) {
      toast.error("Please enter both Student ID and NRIC");
      return;
    }
    setLoading(true);
    // Try the NRIC as entered (digits-only first, then raw) so legacy
    // seed data with dashes still works.
    const email = studentEmail(sid);
    let { error } = await supabase.auth.signInWithPassword({ email, password: nricDigits });
    if (error && nricDigits !== nric.trim()) {
      ({ error } = await supabase.auth.signInWithPassword({ email, password: nric.trim() }));
    }
    setLoading(false);
    if (error) {
      return toast.error("Invalid Student ID or NRIC. Please check and try again.");
    }
    toast.success("Welcome back");
    navigate({ to: "/student/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--surface-blue)]">
      <div className="w-full max-w-md bg-card rounded-xl p-8 border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-center mb-6"><IucLogo className="h-14" /></div>
        <h1 className="text-2xl font-semibold text-center mb-1">Student Portal</h1>
        <p className="text-sm text-[var(--slate-text)] text-center mb-8">Sign in with your Student ID and NRIC</p>
        <form onSubmit={submit} className="space-y-5">
          <div><Label htmlFor="sid">Student ID</Label><Input id="sid" required value={studentId} onChange={(e) => setSid(e.target.value)} placeholder="IUC2024001" className="h-11 mt-2" /></div>
          <div><Label htmlFor="nric">NRIC (Password)</Label><Input id="nric" type="password" required value={nric} onChange={(e) => setNric(e.target.value)} className="h-11 mt-2" /></div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]">{loading ? "Signing in…" : "Sign In"}</Button>
        </form>
        <p className="text-xs text-center mt-6 text-[var(--slate-text)]">Admin? <Link to="/login/admin" className="text-[var(--primary-accent)] font-semibold">Admin login</Link></p>
        <Button asChild variant="outline" className="mt-4 w-full h-11"><Link to="/payment">Make Payment · Non-students</Link></Button>
      </div>
    </div>
  );
}