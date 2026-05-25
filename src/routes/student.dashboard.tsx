import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";

export const Route = createFileRoute("/student/dashboard")({ component: Dashboard });

function Dashboard() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("*").eq("user_id", userId!).single()).data,
  });
  if (!profile) return <p className="text-[var(--slate-text)]">Loading…</p>;
  const cards = [
    { label: "Total Fees", value: `RM ${Number(profile.total_fee).toFixed(2)}`, accent: "text-primary" },
    { label: "Total Paid", value: `RM ${Number(profile.total_paid).toFixed(2)}`, accent: "text-green-700" },
    { label: "Outstanding", value: `RM ${Number(profile.outstanding_balance).toFixed(2)}`, accent: "text-red-700" },
    { label: "Status", value: profile.payment_status.replace(/_/g, " "), accent: "text-[var(--primary-accent)]" },
  ];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Welcome, {profile.full_name}</h1>
        <p className="text-[var(--slate-text)] mt-2 text-sm">{profile.student_id} · {profile.programme} · {profile.semester}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{c.label}</p>
            <p className={`mt-3 text-2xl font-semibold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-[var(--surface-blue)] border-l-4 border-[var(--primary-accent)] rounded-lg p-6">
        <h2 className="font-semibold text-primary">Phase 1 ready</h2>
        <p className="text-sm text-[var(--slate-text)] mt-1">Make Payment, Ledger, History, Receipts and the full Admin portal land in the next phases.</p>
      </div>
    </div>
  );
}