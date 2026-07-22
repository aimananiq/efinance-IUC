import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/student/receipt")({
  head: () => ({ meta: [{ title: "Receipts · E-Pay IUC" }] }),
  component: Receipts,
});

function Receipts() {
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp-id-r", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("id,full_name,student_id").eq("user_id", userId!).single()).data,
  });
  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipts", profile?.id], enabled: !!profile?.id,
    queryFn: async () => (await supabase.from("receipts").select("*, payments:payment_id(payment_reference,amount,payment_method,created_at,verified_at)").eq("student_id", profile!.id).order("created_at", { ascending: false })).data ?? [],
  });

  async function downloadOfficial(path: string | null) {
    if (!path) return;
    const { data } = await supabase.storage.from("official-receipts").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Receipts</h1>
        <p className="text-sm text-[var(--slate-text)] mt-1">Official receipts for approved payments.</p>
      </header>

      {isLoading && <p className="text-sm text-[var(--slate-text)]">Loading…</p>}
      {!isLoading && (!receipts || receipts.length === 0) && (
        <div className="bg-card border border-[var(--border)] rounded-xl p-10 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <FileText className="w-10 h-10 text-[var(--slate-text)] mx-auto mb-3" />
          <p className="text-sm text-[var(--slate-text)]">No receipts yet. Receipts appear after the Finance office approves your payment.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {receipts?.map((r: any) => (
          <article key={r.id} className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">Receipt No.</p>
                <p className="font-mono text-primary font-semibold mt-1">{r.receipt_number}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">APPROVED</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <div><dt className="text-xs uppercase text-[var(--slate-text)]">Payment Ref.</dt><dd className="font-mono text-xs mt-0.5">{r.payments?.payment_reference}</dd></div>
              <div><dt className="text-xs uppercase text-[var(--slate-text)]">Amount</dt><dd className="font-semibold mt-0.5">RM {Number(r.payments?.amount ?? 0).toFixed(2)}</dd></div>
              <div><dt className="text-xs uppercase text-[var(--slate-text)]">Method</dt><dd className="mt-0.5">{String(r.payments?.payment_method ?? "—").replace(/_/g, " ")}</dd></div>
              <div><dt className="text-xs uppercase text-[var(--slate-text)]">Issued</dt><dd className="mt-0.5">{new Date(r.created_at).toLocaleDateString()}</dd></div>
            </dl>
            <div className="mt-5">
              {r.official_receipt_url ? (
                <Button onClick={() => downloadOfficial(r.official_receipt_url)} className="rounded-xl bg-primary hover:bg-[var(--primary-hover)] h-11">
                  <Download className="w-4 h-4 mr-2" />Download Official Receipt
                </Button>
              ) : (
                <p className="text-xs text-[var(--slate-text)]">Official PDF will be uploaded by Finance shortly.</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}