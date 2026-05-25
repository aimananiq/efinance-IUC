import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/fees")({ component: FeesPage });

function FeesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: students } = useQuery({
    queryKey: ["fees-students"],
    queryFn: async () => (await supabase.from("student_profiles").select("id, student_id, full_name, nric, outstanding_balance, total_fee, total_paid, payment_status").order("student_id")).data ?? [],
  });
  const filtered = (students ?? []).filter((s) =>
    !q || s.student_id.toLowerCase().includes(q.toLowerCase()) || s.full_name.toLowerCase().includes(q.toLowerCase()) || s.nric.includes(q),
  );
  const selectedStudent = filtered.find((s) => s.id === selected) ?? students?.find((s) => s.id === selected) ?? null;

  const { data: fees, refetch } = useQuery({
    queryKey: ["fees", selected], enabled: !!selected,
    queryFn: async () => (await supabase.from("fee_items").select("*").eq("student_id", selected!).order("sort_order")).data ?? [],
  });

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function addFee() {
    if (!selected || !name.trim() || !Number(amount)) return toast.error("Name and amount are required");
    setSaving(true);
    const amt = Number(amount);
    const { error } = await supabase.from("fee_items").insert({
      student_id: selected, name: name.trim(), amount: amt, balance: amt, paid_amount: 0,
      due_date: due || null, sort_order: (fees?.length ?? 0) + 1,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Fee item added"); setName(""); setAmount(""); setDue(""); await supabase.rpc("recalc_student_totals" as any, { p_student_id: selected }); refetch(); qc.invalidateQueries({ queryKey: ["fees-students"] }); }
    setSaving(false);
  }

  async function updateFee(id: string, patch: Record<string, any>) {
    const { error } = await supabase.from("fee_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("recalc_student_totals" as any, { p_student_id: selected! });
    refetch(); qc.invalidateQueries({ queryKey: ["fees-students"] });
    toast.success("Updated");
  }

  async function delFee(id: string) {
    if (!confirm("Delete this fee item?")) return;
    const { error } = await supabase.from("fee_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.rpc("recalc_student_totals" as any, { p_student_id: selected! });
    refetch(); qc.invalidateQueries({ queryKey: ["fees-students"] });
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Fee Management</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">Search a student and manage their fee items.</p>
      </header>
      <Input placeholder="Search by name, Student ID, or NRIC…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-card border border-[var(--border)] rounded-xl p-2 max-h-[600px] overflow-auto" style={{ boxShadow: "var(--shadow-card)" }}>
          {filtered.length === 0 ? <p className="p-4 text-sm text-[var(--slate-text)]">No students.</p> :
            filtered.map((s) => (
              <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full text-left px-4 py-3 rounded-lg text-sm ${selected === s.id ? "bg-[var(--sky-accent)] text-[var(--primary-accent)]" : "hover:bg-[var(--surface-blue)]"}`}>
                <div className="font-semibold">{s.student_id}</div>
                <div className="text-xs text-[var(--slate-text)]">{s.full_name}</div>
                <div className="text-xs mt-0.5">Outstanding: RM {Number(s.outstanding_balance).toFixed(2)}</div>
              </button>
            ))}
        </div>
        <div className="space-y-4">
          {!selectedStudent ? (
            <div className="bg-card border border-[var(--border)] rounded-xl p-10 text-center text-sm text-[var(--slate-text)]">Select a student to manage fees.</div>
          ) : (
            <>
              <div className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-semibold text-lg">{selectedStudent.full_name}</h2>
                    <p className="text-xs text-[var(--slate-text)]">{selectedStudent.student_id} · Status {selectedStudent.payment_status}</p>
                  </div>
                  <div className="text-sm text-right">
                    <p>Total: <b>RM {Number(selectedStudent.total_fee).toFixed(2)}</b></p>
                    <p>Paid: <b className="text-emerald-600">RM {Number(selectedStudent.total_paid).toFixed(2)}</b></p>
                    <p>Outstanding: <b className="text-red-700">RM {Number(selectedStudent.outstanding_balance).toFixed(2)}</b></p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-[var(--border)] rounded-xl p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="font-semibold mb-3">Add Fee Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tuition Fee — Sem 1" className="h-10 mt-1" /></div>
                  <div><Label>Amount (RM)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 mt-1" /></div>
                  <div><Label>Due Date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 mt-1" /></div>
                </div>
                <Button onClick={addFee} disabled={saving} className="mt-3 rounded-xl bg-primary hover:bg-[var(--primary-hover)] h-10"><Plus className="w-4 h-4 mr-1" />Add Item</Button>
              </div>
              <div className="bg-card border border-[var(--border)] rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
                    <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Due</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(fees ?? []).length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-[var(--slate-text)]">No fee items yet.</td></tr> :
                      (fees ?? []).map((f: any) => (
                        <tr key={f.id} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2"><input defaultValue={f.name} onBlur={(e) => e.target.value !== f.name && updateFee(f.id, { name: e.target.value })} className="bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-[var(--ring)] rounded px-1" /></td>
                          <td className="px-3 py-2 text-right"><input type="number" step="0.01" defaultValue={f.amount} onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(f.amount)) updateFee(f.id, { amount: v, balance: Math.max(v - Number(f.paid_amount), 0) }); }} className="bg-transparent w-24 text-right focus:outline-none focus:ring-1 focus:ring-[var(--ring)] rounded px-1" /></td>
                          <td className="px-3 py-2 text-right"><input type="number" step="0.01" defaultValue={f.paid_amount} onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(f.paid_amount)) updateFee(f.id, { paid_amount: v, balance: Math.max(Number(f.amount) - v, 0), status: v >= Number(f.amount) ? "PAID" : v > 0 ? "PARTIAL_PAID" : "UNPAID" }); }} className="bg-transparent w-24 text-right focus:outline-none focus:ring-1 focus:ring-[var(--ring)] rounded px-1" /></td>
                          <td className="px-3 py-2 text-right">RM {Number(f.balance).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            <select defaultValue={f.status} onChange={(e) => updateFee(f.id, { status: e.target.value })} className="bg-transparent border border-[var(--border)] rounded px-1 py-0.5 text-xs">
                              <option value="UNPAID">UNPAID</option><option value="PARTIAL_PAID">PARTIAL_PAID</option><option value="PAID">PAID</option>
                            </select>
                          </td>
                          <td className="px-3 py-2"><input type="date" defaultValue={f.due_date ?? ""} onBlur={(e) => e.target.value !== (f.due_date ?? "") && updateFee(f.id, { due_date: e.target.value || null })} className="bg-transparent text-xs" /></td>
                          <td className="px-3 py-2 text-right"><button onClick={() => delFee(f.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}