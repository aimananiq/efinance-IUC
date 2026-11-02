import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, FileText } from "lucide-react";
import { toast } from "sonner";

export function OutsidePaymentReview() {
  const qc = useQueryClient(); const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING"); const [busy, setBusy] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["admin-outside-payments"], queryFn: async () => {
    const { data, error } = await supabase.from("outside_payments").select("*").order("created_at", { ascending: false });
    if (error) throw error; return data;
  }});
  async function viewProof(path: string) {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (error) { tab?.close(); toast.error("Unable to open payment proof"); return; }
    if (tab) tab.location.href = data.signedUrl;
    else toast.error("Allow pop-ups to view payment proof");
  }
  async function review(id: string, value: "APPROVED" | "REJECTED") {
    const remarks = prompt(value === "REJECTED" ? "Reason for rejection (required):" : "Optional admin remarks:");
    if (remarks === null || (value === "REJECTED" && !remarks.trim())) return;
    if (remarks.length > 1000) return toast.error("Remarks must be 1000 characters or fewer");
    setBusy(id);
    const { data, error } = await supabase.from("outside_payments").update({ status: value, admin_remarks: remarks.trim() || null }).eq("id", id).eq("status", "PENDING").select("id");
    setBusy(null);
    if (error) return toast.error("Unable to review payment");
    if (!data?.length) toast.error("This payment has already been reviewed");
    else toast.success(value === "APPROVED" ? "Outside payment approved" : "Outside payment rejected");
    await qc.invalidateQueries({ queryKey: ["admin-outside-payments"] });
  }
  const filtered = query.data?.filter(p => (status === "ALL" || p.status === status) && [p.payer_name, p.contact, p.purpose, p.payment_reference].some(value => value.toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3"><Input aria-label="Search outside payments" placeholder="Search name, contact, purpose or reference…" className="max-w-md h-11" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Outside payment status" className="h-11 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}>{["PENDING", "APPROVED", "REJECTED", "ALL"].map(s => <option key={s} value={s}>{s === "ALL" ? "All statuses" : s}</option>)}</select></div>
    {query.isError ? <p role="alert" className="text-destructive">Unable to load outside payments. <Button variant="outline" onClick={() => query.refetch()}>Retry</Button></p> : <div className="overflow-x-auto border rounded-lg bg-card"><table className="w-full text-sm"><thead className="bg-muted"><tr>{["Reference", "Payer", "Purpose", "Method", "Amount", "Status", "Submitted", "Actions"].map(h => <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
      {query.isLoading ? <tr><td colSpan={8} className="p-6 text-center">Loading…</td></tr> : !filtered?.length ? <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No outside payments.</td></tr> : filtered.map(p => <tr key={p.id} className="border-t">
        <td className="p-3 font-mono text-xs">{p.payment_reference}</td><td className="p-3"><p className="font-medium">{p.payer_name}</p><p className="text-xs text-muted-foreground">{p.contact}</p></td><td className="p-3 min-w-48"><p>{p.purpose}</p>{p.remarks && <p className="text-xs text-muted-foreground">{p.remarks}</p>}</td><td className="p-3 text-xs">{p.payment_method.replaceAll("_", " ")}</td><td className="p-3 whitespace-nowrap font-semibold">RM {Number(p.amount).toFixed(2)}</td><td className="p-3">{p.status}{p.admin_remarks && <p className="text-xs text-muted-foreground">{p.admin_remarks}</p>}</td><td className="p-3 text-xs whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td><td className="p-3"><div className="flex gap-1">
          <Button size="icon" variant="outline" title="View payment proof" aria-label={`View proof ${p.payment_reference}`} onClick={() => viewProof(p.receipt_file_url)}><FileText className="h-4 w-4" /></Button>
          {p.status === "PENDING" && <><Button size="icon" disabled={busy === p.id} title="Approve payment" aria-label={`Approve ${p.payment_reference}`} onClick={() => review(p.id, "APPROVED")}><Check className="h-4 w-4" /></Button><Button size="icon" variant="destructive" disabled={busy === p.id} title="Reject payment" aria-label={`Reject ${p.payment_reference}`} onClick={() => review(p.id, "REJECTED")}><X className="h-4 w-4" /></Button></>}
        </div></td>
      </tr>)}
    </tbody></table></div>}
  </div>;
}