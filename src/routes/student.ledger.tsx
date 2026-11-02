import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { useStudentPtptn, formatRM } from "@/hooks/use-student-ptptn";

export const Route = createFileRoute("/student/ledger")({
  head: () => ({ meta: [{"title": "Student Ledger — E-Pay IUC"}, {"name": "description", "content": "Student Ledger for Innovative University College’s E-Pay portal."}, {"property": "og:title", "content": "Student Ledger — E-Pay IUC"}, {"property": "og:description", "content": "Student Ledger for Innovative University College’s E-Pay portal."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
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

function extractSem(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /semester\s*(\d+)/i.exec(s);
  return m ? Number(m[1]) : null;
}

function Ledger() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp-id", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("id,student_id,semester,total_fee,total_paid,outstanding_balance").eq("user_id", userId!).single()).data,
  });
  const studentId = profile?.id;
  const { data: ptptn } = useStudentPtptn(profile?.student_id);
  const { data: items, isLoading } = useQuery({
    queryKey: ["fee-items", studentId], enabled: !!studentId,
    queryFn: async () => (await supabase.from("fee_items").select("*").eq("student_id", studentId!).order("sort_order")).data ?? [],
  });

  const currentSem = extractSem(profile?.semester) ?? 1;
  const allItems = items ?? [];
  const hasSemesterInfo = allItems.some((it: any) => extractSem(it.description) !== null || extractSem(it.name) !== null);
  const visibleItems = hasSemesterInfo
    ? allItems.filter((it: any) => {
        const s = extractSem(it.description) ?? extractSem(it.name);
        return s === null || s <= currentSem;
      })
    : allItems;

  const feesDueToDate = visibleItems.reduce((sum: number, it: any) => sum + Number(it.amount || 0), 0);
  const totalPaid = Number(profile?.total_paid ?? 0);
  const ptptnAmount = Number(ptptn?.ptptn_amount ?? 0);
  const outstandingToDate = Math.max(feesDueToDate - ptptnAmount - totalPaid, 0);

  const periods = [3, 6, 12] as const;
  const [months, setMonths] = useState<number>(6);
  const monthly = outstandingToDate > 0 ? outstandingToDate / months : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Fee Ledger</h1>
        <p className="text-sm text-[var(--slate-text)] mt-1">Fees due up to your current semester ({profile?.semester ?? "—"}). Future-semester fees are excluded.</p>
      </header>

      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label={`Fees Due (up to ${profile.semester ?? "current"})`} value={formatRM(feesDueToDate)} />
          <Stat label="Total Paid" value={formatRM(totalPaid)} accent="text-green-700" />
          {ptptn && <Stat label="PTPTN Received" value={formatRM(ptptnAmount)} accent="text-[var(--primary-accent)]" />}
          <Stat
            label={ptptn ? "Outstanding (after PTPTN)" : "Current Outstanding"}
            value={formatRM(outstandingToDate)}
            accent="text-red-700"
          />
        </div>
      )}

      <div className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">Recommended Payment Schedule</p>
            <h2 className="mt-1 text-xl font-semibold text-primary">Suggested Monthly Payment</h2>
            <p className="text-xs text-[var(--slate-text)] mt-1 max-w-lg">
              Guideline only — not a mandatory instalment plan. Settling your outstanding balance as early as possible is encouraged.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--slate-text)]">Spread over</span>
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMonths(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  months === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-[var(--slate-text)] border-[var(--border)] hover:bg-[var(--surface-blue)]/40"
                }`}
              >
                {p} months
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Current Outstanding" value={formatRM(outstandingToDate)} accent="text-red-700" />
          <Stat label="Suggested Monthly" value={formatRM(monthly)} accent="text-primary" />
          <Stat label="Over" value={`${months} months`} />
        </div>
      </div>

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
              {!isLoading && visibleItems.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--slate-text)]">No fee items due up to your current semester.</td></tr>
              )}
              {visibleItems.map((it: any) => (
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