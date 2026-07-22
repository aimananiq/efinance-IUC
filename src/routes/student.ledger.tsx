import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { useStudentPtptn, formatRM } from "@/hooks/use-student-ptptn";

export const Route = createFileRoute("/student/ledger")({
  head: () => ({ meta: [{ title: "Fee Ledger · IUC E-Pay IUC" }] }),
  component: Ledger,
});

const statusStyle: Record<string, string> = {
  PAID: "bg-green-50 text-green-700 border-green-200",
  PARTIAL_PAID: "bg-amber-50 text-amber-700 border-amber-200",
  UNPAID: "bg-red-50 text-red-700 border-red-200",
};

function fmt(n: number | string | null) {
  return `RM ${Number(n ?? 0).toFixed(2)}`;
}

function Ledger() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp-id", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("id,student_id,total_fee,total_paid,outstanding_balance").eq("user_id", userId!).single()).data,
  });
  const studentId = profile?.id;
  const { data: ptptn } = useStudentPtptn(profile?.student_id);
  const { data: items, isLoading } = useQuery({
    queryKey: ["fee-items", studentId], enabled: !!studentId,
    queryFn: async () => (await supabase.from("fee_items").select("*").eq("student_id", studentId!).order("sort_order")).data ?? [],
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Fee Ledger</h1>
        <p className="text-sm text-[var(--slate-text)] mt-1">Itemised breakdown of your fees, payments and outstanding balance.</p>
      </header>

      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Total Fees" value={formatRM(Number(profile.total_fee))} />
          <Stat label="Total Paid" value={formatRM(Number(profile.total_paid))} accent="text-green-700" />
          <Stat
            label={ptptn ? "Outstanding (after PTPTN)" : "Outstanding"}
            value={formatRM(Math.max(Number(profile.outstanding_balance) - Number(ptptn?.ptptn_amount ?? 0), 0))}
            accent="text-red-700"
          />
        </div>
      )}

      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-blue)] text-[var(--slate-text)]">
              <tr>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Fee Item</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Due</th>
                <th className="text-right font-semibold uppercase text-xs tracking-wider px-6 py-3">Amount</th>
                <th className="text-right font-semibold uppercase text-xs tracking-wider px-6 py-3">Paid</th>
                <th className="text-right font-semibold uppercase text-xs tracking-wider px-6 py-3">Balance</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading && (<tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--slate-text)]">Loading…</td></tr>)}
              {!isLoading && (!items || items.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--slate-text)]">No fee items yet.</td></tr>
              )}
              {items?.map((it: any) => (
                <tr key={it.id} className="hover:bg-[var(--surface-blue)]/40">
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{it.name}</p>
                    {it.description && <p className="text-xs text-[var(--slate-text)] mt-0.5">{it.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-[var(--slate-text)]">{it.due_date ?? "—"}</td>
                  <td className="px-6 py-4 text-right font-medium">{fmt(it.amount)}</td>
                  <td className="px-6 py-4 text-right text-green-700">{fmt(it.paid_amount)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-primary">{fmt(it.balance)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle[it.status] ?? "bg-muted text-foreground border-[var(--border)]"}`}>
                      {String(it.status).replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-primary" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-card border border-[var(--border)] rounded-xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}