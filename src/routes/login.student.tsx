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
  head: () => ({ meta: [{ title: "Student Login — IUC E-Finance" }, { name: "description", content: "Sign in to the IUC E-Finance student portal with your Student ID and NRIC." }] }),
  component: StudentLogin,
});

function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setSid] = useState("");
  const [nric, setNric] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: studentEmail(studentId),
      password: nric,
    });
    setLoading(false);
    if (error) { toast.error("Invalid Student ID or NRIC"); return; }
    toast.success("Welcome back");
    navigate({ to: "/student/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--surface-blue)]">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-card)] p-8 border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-center mb-6"><IucLogo className="h-14" /></div>
        <h1 className="text-2xl font-semibold text-center mb-1">Student Portal</h1>
        <p className="text-sm text-[var(--slate-text)] text-center mb-8">Sign in with your Student ID and NRIC</p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="sid">Student ID</Label>
            <Input id="sid" required value={studentId} onChange={(e) => setSid(e.target.value)} placeholder="IUC2024001" className="h-11 mt-2" />
          </div>
          <div>
            <Label htmlFor="nric">NRIC (Password)</Label>
            <Input id="nric" type="password" required value={nric} onChange={(e) => setNric(e.target.value)} placeholder="Your NRIC number" className="h-11 mt-2" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]">
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
        <p className="text-xs text-center mt-6 text-[var(--slate-text)]">
          Admin? <Link to="/login/admin" className="text-[var(--primary-accent)] font-semibold">Admin login</Link>
        </p>
      </div>
    </div>
  );
}
*** Add File: src/routes/login.admin.tsx
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
  head: () => ({ meta: [{ title: "Admin Login — IUC E-Finance" }, { name: "description", content: "IUC finance administrator sign-in." }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail(username),
      password,
    });
    setLoading(false);
    if (error) { toast.error("Invalid credentials"); return; }
    toast.success("Welcome");
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-card)] p-8 border" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex justify-center mb-6"><IucLogo className="h-14" /></div>
        <h1 className="text-2xl font-semibold text-center mb-1">Admin Portal</h1>
        <p className="text-sm text-[var(--slate-text)] text-center mb-8">Finance administrator access</p>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="u">Username</Label>
            <Input id="u" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="h-11 mt-2" />
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 mt-2" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-2xl bg-primary hover:bg-[var(--primary-hover)]">
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
        <p className="text-xs text-center mt-6 text-[var(--slate-text)]">
          Student? <Link to="/login/student" className="text-[var(--primary-accent)] font-semibold">Student login</Link>
        </p>
      </div>
    </div>
  );
}
*** Add File: src/components/iuc/PortalShell.tsx
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IucLogo } from "./Logo";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NavItem { to: string; label: string; icon?: ReactNode }

export function PortalShell({ items, title, children }: { items: NavItem[]; title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex bg-[var(--surface-muted)]">
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)]">
          <IucLogo className="h-10" />
          <p className="text-xs text-[var(--slate-text)] font-semibold mt-2 uppercase tracking-wider">{title}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {items.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            return (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${active ? "bg-[var(--sky-accent)] text-[var(--primary-accent)]" : "text-foreground hover:bg-[var(--surface-blue)] hover:text-primary"}`}>
                {it.icon}{it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={logout} className="w-full justify-start h-11 rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden bg-card border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <IucLogo className="h-8" />
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="w-4 h-4" /></Button>
        </header>
        <div className="p-6 md:p-10 max-w-[1280px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
*** Add File: src/routes/student.tsx
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { PortalShell } from "@/components/iuc/PortalShell";
import { LayoutDashboard, CreditCard, ScrollText, History, Receipt, User } from "lucide-react";

export const Route = createFileRoute("/student")({ component: StudentLayout });

function StudentLayout() {
  const { session, role, loading } = useIucAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login/student" });
    else if (role && role !== "STUDENT") navigate({ to: "/admin/dashboard" });
  }, [session, role, loading, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--slate-text)]">Loading…</div>;
  }

  return (
    <PortalShell title="Student Portal" items={[
      { to: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: "/student/payment", label: "Make Payment", icon: <CreditCard className="w-4 h-4" /> },
      { to: "/student/ledger", label: "Ledger", icon: <ScrollText className="w-4 h-4" /> },
      { to: "/student/history", label: "Payment History", icon: <History className="w-4 h-4" /> },
      { to: "/student/receipt", label: "Receipts", icon: <Receipt className="w-4 h-4" /> },
      { to: "/student/profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    ]}>
      <Outlet />
    </PortalShell>
  );
}
*** Add File: src/routes/student.dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";

export const Route = createFileRoute("/student/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — IUC E-Finance" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("student_profiles").select("*").eq("user_id", userId!).single();
      return data;
    },
  });

  if (!profile) return <p className="text-[var(--slate-text)]">Loading your finance record…</p>;

  const cards = [
    { label: "Total Fees", value: `RM ${Number(profile.total_fee).toFixed(2)}`, accent: "text-primary" },
    { label: "Total Paid", value: `RM ${Number(profile.total_paid).toFixed(2)}`, accent: "text-green-700" },
    { label: "Outstanding", value: `RM ${Number(profile.outstanding_balance).toFixed(2)}`, accent: "text-red-700" },
    { label: "Payment Status", value: profile.payment_status.replace("_", " "), accent: "text-[var(--primary-accent)]" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Welcome, {profile.full_name}</h1>
        <p className="text-[var(--slate-text)] mt-2 text-sm">
          {profile.student_id} · {profile.programme} · {profile.semester}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-[var(--border)] rounded-[var(--radius-card)] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{c.label}</p>
            <p className={`mt-3 text-2xl font-semibold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface-blue)] border-l-4 border-[var(--primary-accent)] rounded-lg p-6">
        <h2 className="font-semibold text-primary">Phase 1 ready</h2>
        <p className="text-sm text-[var(--slate-text)] mt-1">
          Authentication, schema, design system, and seeded demo data are live. Next phases will fill out
          Make Payment, Ledger, History, Receipts, and the full Admin portal.
        </p>
      </div>
    </div>
  );
}
*** Add File: src/routes/admin.tsx
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { PortalShell } from "@/components/iuc/PortalShell";
import { LayoutDashboard, Users, ListChecks, CheckCircle2, Receipt, Bell, History, Settings } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { session, role, loading } = useIucAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login/admin" });
    else if (role && role !== "ADMIN") navigate({ to: "/student/dashboard" });
  }, [session, role, loading, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--slate-text)]">Loading…</div>;
  }

  return (
    <PortalShell title="Admin Portal" items={[
      { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: "/admin/students", label: "Students", icon: <Users className="w-4 h-4" /> },
      { to: "/admin/fees", label: "Fee Management", icon: <ListChecks className="w-4 h-4" /> },
      { to: "/admin/payments", label: "Verify Payments", icon: <CheckCircle2 className="w-4 h-4" /> },
      { to: "/admin/receipts", label: "Receipts", icon: <Receipt className="w-4 h-4" /> },
      { to: "/admin/notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
      { to: "/admin/history", label: "Audit History", icon: <History className="w-4 h-4" /> },
      { to: "/admin/settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
    ]}>
      <Outlet />
    </PortalShell>
  );
}
*** Add File: src/routes/admin.dashboard.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — IUC E-Finance" }] }),
  component: AdminDash,
});

function AdminDash() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, pending, payments] = await Promise.all([
        supabase.from("student_profiles").select("payment_status, total_fee, total_paid, outstanding_balance"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("payments").select("id, payment_reference, amount, status, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      const sp = students.data ?? [];
      return {
        totalStudents: sp.length,
        totalOutstanding: sp.reduce((a, s) => a + Number(s.outstanding_balance), 0),
        totalPaid: sp.reduce((a, s) => a + Number(s.total_paid), 0),
        pending: pending.count ?? 0,
        fullyPaid: sp.filter((s) => s.payment_status === "FULLY_PAID").length,
        partial: sp.filter((s) => s.payment_status === "PARTIAL_PAID").length,
        unpaid: sp.filter((s) => s.payment_status === "UNPAID").length,
        recent: payments.data ?? [],
      };
    },
  });

  if (!data) return <p className="text-[var(--slate-text)]">Loading…</p>;

  const cards = [
    { label: "Total Students", value: data.totalStudents },
    { label: "Total Outstanding", value: `RM ${data.totalOutstanding.toFixed(2)}` },
    { label: "Total Paid", value: `RM ${data.totalPaid.toFixed(2)}` },
    { label: "Pending Verifications", value: data.pending },
    { label: "Fully Paid", value: data.fullyPaid },
    { label: "Partial Paid", value: data.partial },
    { label: "Unpaid", value: data.unpaid },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Finance Dashboard</h1>
        <p className="text-[var(--slate-text)] mt-2 text-sm">Overview of student finance across IUC.</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-[var(--border)] rounded-[var(--radius-card)] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{c.label}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-[var(--border)] rounded-[var(--radius-card)] p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-[var(--slate-text)]">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-[var(--slate-text)] text-left">
              <th className="py-2">Reference</th><th>Amount</th><th>Status</th><th>Date</th>
            </tr></thead>
            <tbody>
              {data.recent.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2 font-medium">{p.payment_reference}</td>
                  <td>RM {Number(p.amount).toFixed(2)}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}