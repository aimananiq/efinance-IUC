import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDash });

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
    { label: "Outstanding", value: `RM ${data.totalOutstanding.toFixed(2)}` },
    { label: "Total Paid", value: `RM ${data.totalPaid.toFixed(2)}` },
    { label: "Pending", value: data.pending },
    { label: "Fully Paid", value: data.fullyPaid },
    { label: "Partial", value: data.partial },
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
          <div key={c.label} className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{c.label}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
        {data.recent.length === 0 ? <p className="text-sm text-[var(--slate-text)]">No payments yet. Sample data lands once a student submits one in Phase 2.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-[var(--slate-text)] text-left"><th className="py-2">Reference</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{data.recent.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]"><td className="py-2 font-medium">{p.payment_reference}</td><td>RM {Number(p.amount).toFixed(2)}</td><td>{p.status}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}