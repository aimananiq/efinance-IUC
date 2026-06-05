import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/receipts")({ component: ReceiptsPage });

function ReceiptsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-receipts"],
    queryFn: async () => (await supabase.from("receipts").select("*, student_profiles!inner(student_id, full_name, nric), payments!inner(payment_reference, amount)").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = (data ?? []).filter((r: any) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return r.receipt_number.toLowerCase().includes(t) || r.student_profiles?.student_id?.toLowerCase().includes(t) || r.student_profiles?.full_name?.toLowerCase().includes(t) || r.student_profiles?.nric?.includes(q);
  });

  async function download(bucket: string, path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function uploadOfficial(receiptId: string, studentUserOwnerId: string, file: File) {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${studentUserOwnerId}/${receiptId}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("official-receipts").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) return toast.error(up.error.message);
    const { error } = await supabase.from("receipts").update({ official_receipt_url: up.data.path }).eq("id", receiptId);
    if (error) return toast.error(error.message);
    toast.success("Official receipt uploaded");
    qc.invalidateQueries({ queryKey: ["admin-receipts"] });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Receipts</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">All issued receipts. Upload an official PDF to make it available to the student.</p>
      </header>
      <Input placeholder="Search by receipt #, name, Student ID, NRIC…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
            <tr><th className="px-4 py-3 text-left">Receipt #</th><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Payment Ref</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Issued</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-[var(--slate-text)]">Loading…</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-[var(--slate-text)]">No receipts yet.</td></tr> :
              filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono text-xs">{r.receipt_number}</td>
                  <td className="px-4 py-3"><div className="font-medium">{r.student_profiles?.full_name}</div><div className="text-xs text-[var(--slate-text)]">{r.student_profiles?.student_id}</div></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.payments?.payment_reference}</td>
                  <td className="px-4 py-3 text-right">RM {Number(r.payments?.amount ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {r.official_receipt_url && <Button size="sm" variant="outline" onClick={() => download("official-receipts", r.official_receipt_url)}><Download className="w-3.5 h-3.5" /></Button>}
                      <label className="inline-flex items-center gap-1 cursor-pointer text-xs px-2 py-1 border border-[var(--border)] rounded-md hover:bg-[var(--surface-blue)]">
                        <Upload className="w-3.5 h-3.5" /> {r.official_receipt_url ? "Replace" : "Upload"}
                        <input type="file" accept="application/pdf,image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await uploadOfficial(r.id, r.student_id, f); e.target.value = ""; }} />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}