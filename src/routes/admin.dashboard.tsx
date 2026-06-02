import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDash });

function AdminDash() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [students, pending, payments, ptptn] = await Promise.all([
        supabase.from("student_profiles").select("payment_status, total_fee, total_paid, outstanding_balance"),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("payments").select("id, payment_reference, amount, status, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("ptptn_records").select("total_fee, ptptn_amount"),
      ]);
      const sp = students.data ?? [];
      const pp = ptptn.data ?? [];
      const ptptnDisbursed = pp.reduce((a, r) => a + Number(r.ptptn_amount), 0);
      const ptptnStudents = pp.filter((r) => Number(r.ptptn_amount) > 0).length;
      const ptptnOutstanding = pp.reduce((a, r) => a + Math.max(Number(r.total_fee) - Number(r.ptptn_amount), 0), 0);
      return {
        totalStudents: sp.length,
        totalOutstanding: sp.reduce((a, s) => a + Number(s.outstanding_balance), 0),
        totalPaid: sp.reduce((a, s) => a + Number(s.total_paid), 0),
        pending: pending.count ?? 0,
        fullyPaid: sp.filter((s) => s.payment_status === "FULLY_PAID").length,
        partial: sp.filter((s) => s.payment_status === "PARTIAL_PAID").length,
        unpaid: sp.filter((s) => s.payment_status === "UNPAID").length,
        recent: payments.data ?? [],
        ptptnDisbursed,
        ptptnStudents,
        ptptnOutstanding,
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
  const fmtRM = (n: number) =>
    "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <div className="bg-card border border-[var(--border)] rounded-xl p-6 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[var(--primary-accent)]" /> PTPTN
            </p>
            <p className="text-sm text-[var(--slate-text)] mt-1">Live summary of PTPTN disbursement across all students.</p>
          </div>
          <span className="hidden md:inline-flex items-center rounded-md bg-[var(--sky-accent)] text-[var(--primary-accent)] px-2 py-0.5 text-xs font-medium">Live</span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <p className="text-xs text-[var(--slate-text)] uppercase tracking-wider">Total PTPTN Disbursed</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{fmtRM(data.ptptnDisbursed)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--slate-text)] uppercase tracking-wider">Students with PTPTN</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{data.ptptnStudents}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--slate-text)] uppercase tracking-wider">Outstanding After PTPTN</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{fmtRM(data.ptptnOutstanding)}</p>
          </div>
        </div>
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