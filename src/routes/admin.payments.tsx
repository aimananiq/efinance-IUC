import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, FileText } from "lucide-react";
import { OutsidePaymentReview } from "@/components/iuc/OutsidePaymentReview";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Verify Payments — E-Pay IUC" }, { name: "description", content: "Review student and outside-payer payment submissions." }, { property: "og:title", content: "Verify Payments — E-Pay IUC" }, { property: "og:description", content: "Finance payment verification for Innovative University College." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: async () => {
      let qb = supabase.from("payments").select("*, student_profiles!inner(student_id, full_name, nric)").order("created_at", { ascending: false });
      if (status !== "ALL") qb = qb.eq("status", status);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((p: any) => {
    if (!q) return true;
    const s = p.student_profiles ?? {};
    const t = q.toLowerCase();
    return p.payment_reference.toLowerCase().includes(t) || s.student_id?.toLowerCase().includes(t) || s.full_name?.toLowerCase().includes(t) || s.nric?.includes(q);
  });

  async function viewReceipt(path: string) {
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function approve(id: string) {
    const remarks = prompt("Optional admin remarks:") ?? "";
    const { data, error } = await supabase.rpc("approve_payment" as any, { p_payment_id: id, p_admin_remarks: remarks || null });
    if (error) return toast.error(error.message);
    toast.success(`Approved · Receipt ${(data as any)?.receipt_number ?? ""}`);
    refetch(); qc.invalidateQueries();
  }
  async function reject(id: string) {
    const remarks = prompt("Reason for rejection (required):");
    if (!remarks?.trim()) return;
    const { error } = await supabase.rpc("reject_payment" as any, { p_payment_id: id, p_admin_remarks: remarks });
    if (error) return toast.error(error.message);
    toast.success("Payment rejected");
    refetch(); qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Verify Payments</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">Student and outside-payer submissions</p>
      </header>
      <Tabs defaultValue="students">
        <TabsList><TabsTrigger value="students">Student Payments</TabsTrigger><TabsTrigger value="outside">Outside Payments</TabsTrigger></TabsList>
        <TabsContent value="outside"><OutsidePaymentReview /></TabsContent>
        <TabsContent value="students" className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <Input placeholder="Search by reference, name, ID, NRIC…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-11 px-3 rounded-md border border-[var(--input)] bg-background text-sm">
          <option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
        </select>
      </div>
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
            <tr><th className="px-4 py-3 text-left">Reference</th><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Submitted</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-[var(--slate-text)]">Loading…</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-[var(--slate-text)]">No payments.</td></tr> :
              filtered.map((p: any) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono text-xs">{p.payment_reference}</td>
                  <td className="px-4 py-3"><div className="font-medium">{p.student_profiles?.full_name}</div><div className="text-xs text-[var(--slate-text)]">{p.student_profiles?.student_id}</div></td>
                  <td className="px-4 py-3 text-xs">{String(p.payment_method).replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">RM {Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className="text-xs font-semibold">{p.status}</span></td>
                  <td className="px-4 py-3 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {p.receipt_file_url && <Button size="sm" variant="outline" onClick={() => viewReceipt(p.receipt_file_url)}><FileText className="w-3.5 h-3.5" /></Button>}
                      {p.status === "PENDING" && <>
                        <Button size="sm" onClick={() => approve(p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(p.id)}><X className="w-3.5 h-3.5" /></Button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}