import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/student/history")({
  head: () => ({ meta: [{ title: "Payment History · IUC E-Finance" }] }),
  component: History,
});

const statusStyle: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function History() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp-id-h", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("id").eq("user_id", userId!).single()).data,
  });
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", profile?.id], enabled: !!profile?.id,
    queryFn: async () => (await supabase.from("payments").select("*").eq("student_id", profile!.id).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Payment History</h1>
          <p className="text-sm text-[var(--slate-text)] mt-1">Submissions made and their verification status.</p>
        </div>
        <Button asChild className="rounded-xl bg-primary hover:bg-[var(--primary-hover)] h-11 px-5">
          <Link to="/student/payment">New Payment</Link>
        </Button>
      </header>

      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-blue)] text-[var(--slate-text)]">
              <tr>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Reference</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Date</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Method</th>
                <th className="text-right font-semibold uppercase text-xs tracking-wider px-6 py-3">Amount</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Status</th>
                <th className="text-left font-semibold uppercase text-xs tracking-wider px-6 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading && (<tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--slate-text)]">Loading…</td></tr>)}
              {!isLoading && (!payments || payments.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--slate-text)]">No payments submitted yet.</td></tr>
              )}
              {payments?.map((p: any) => (
                <tr key={p.id} className="hover:bg-[var(--surface-blue)]/40">
                  <td className="px-6 py-4 font-mono text-xs text-primary">{p.payment_reference}</td>
                  <td className="px-6 py-4 text-[var(--slate-text)]">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{String(p.payment_method).replace(/_/g, " ")}</td>
                  <td className="px-6 py-4 text-right font-semibold">RM {Number(p.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle[p.status] ?? "bg-muted text-foreground border-[var(--border)]"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--slate-text)] max-w-xs">{p.admin_remarks ?? p.remarks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}