import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { useStudentPtptn, formatRM } from "@/hooks/use-student-ptptn";

export const Route = createFileRoute("/student/dashboard")({ component: Dashboard });

function Dashboard() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("*").eq("user_id", userId!).single()).data,
  });
  const { data: ptptn } = useStudentPtptn(profile?.student_id);
  if (!profile) return <p className="text-[var(--slate-text)]">Loading…</p>;
  const totalFee = Number(profile.total_fee) || 0;
  const totalPaid = Number(profile.total_paid) || 0;
  const ptptnAmount = Number(ptptn?.ptptn_amount ?? 0);
  // Single source of truth: Outstanding = Total Fee − PTPTN − Total Paid
  const outstandingAfterPtptn = Math.max(totalFee - ptptnAmount - totalPaid, 0);
  const fullyCovered = ptptn ? ptptnAmount >= totalFee && totalFee > 0 : false;
  // Derive status consistently from the same computed outstanding value
  const derivedStatus =
    outstandingAfterPtptn <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL PAID" : "UNPAID";
  const cards = [
    { label: "Total Fees", value: formatRM(totalFee), accent: "text-primary" },
    { label: "Total Paid", value: formatRM(totalPaid), accent: "text-green-700" },
    { label: ptptn ? "Outstanding (after PTPTN)" : "Outstanding", value: formatRM(outstandingAfterPtptn), accent: "text-red-700" },
    { label: "Status", value: derivedStatus, accent: "text-[var(--primary-accent)]" },
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
      {ptptn && (
        <div className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">PTPTN Information</p>
              <h2 className="mt-1 text-xl font-semibold text-primary">Education Loan Coverage</h2>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                fullyCovered
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {fullyCovered ? "✅ Fully Covered" : "🟡 Partial Coverage"}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Stat label="PTPTN Amount" value={formatRM(ptptnAmount)} accent="text-[var(--primary-accent)]" />
            <Stat label="Total Fee" value={formatRM(totalFee)} accent="text-primary" />
            <Stat label="Outstanding After PTPTN" value={formatRM(outstandingAfterPtptn)} accent="text-red-700" />
          </div>
        </div>
      )}
      <div className="bg-[var(--surface-blue)] border-l-4 border-[var(--primary-accent)] rounded-lg p-6">
        <h2 className="font-semibold text-primary">Phase 1 ready</h2>
        <p className="text-sm text-[var(--slate-text)] mt-1">Make Payment, Ledger, History, Receipts and the full Admin portal land in the next phases.</p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-primary" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-[var(--surface-blue)]/40 border border-[var(--border)] rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}