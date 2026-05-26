import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { importFeeStructure } from "@/lib/fee-structure.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Upload, Trash2, Search } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/fee-structure")({ component: FeeStructurePage });

type Item = { name: string; amount_local: number; amount_international: number; discount_local: number; discount_international: number; sort_order?: number };
type Fs = { id: string; code: string; programme: string; description: string | null; total_amount: number };

function FeeStructurePage() {
  const qc = useQueryClient();
  const importFn = useServerFn(importFeeStructure);
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Fs | null>(null);

  const { data: structures = [], isLoading } = useQuery<Fs[]>({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_structures")
        .select("id, code, programme, description, total_amount").order("code");
      if (error) throw error;
      return data as Fs[];
    },
  });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return structures;
    return structures.filter((s) =>
      s.code.toLowerCase().includes(t) ||
      s.programme.toLowerCase().includes(t) ||
      (s.description ?? "").toLowerCase().includes(t),
    );
  }, [q, structures]);

  const selected = selectedId ? structures.find((s) => s.id === selectedId) ?? null : null;

  const { data: items = [] } = useQuery({
    queryKey: ["fee-structure-items", selectedId], enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_structure_items")
        .select("*").eq("structure_id", selectedId!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/templates/fee-structure-template.xlsx";
    a.download = "fee-structure-template.xlsx";
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const okType = /\.xlsx$|\.xls$/i.test(file.name);
    if (!okType) return toast.error("Please upload a .xlsx or .xls file");
    if (file.size === 0) return toast.error("File is empty");
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large (max 5 MB)");

    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Spreadsheet has no sheet");
      const cell = (a: string) => {
        const c = ws[a];
        return c?.v == null ? "" : String(c.v).trim();
      };
      const num = (a: string) => {
        const c = ws[a];
        const n = c?.v == null ? 0 : Number(c.v);
        return Number.isFinite(n) ? n : 0;
      };
      const code = cell("F8");
      const programme = cell("B7").replace(/^program:\s*/i, "");
      if (!code) throw new Error("Missing Fee Code in cell F8");
      if (!programme) throw new Error("Missing Programme in cell B7");

      const items: Item[] = [];
      for (let r = 11; r <= 24; r++) {
        const name = cell(`B${r}`);
        const amtL = num(`C${r}`);
        const amtI = num(`E${r}`) || amtL; // some templates only fill local
        const discL = num(`D${r}`);
        const discI = num(`D${r}`);
        if (!name && !amtL && !amtI) continue;
        if (!name) continue;
        items.push({ name, amount_local: amtL, amount_international: amtI, discount_local: discL, discount_international: discI });
      }
      if (items.length === 0) throw new Error("No fee items found in rows 11–24");

      const res = await importFn({ data: { code, programme, description: null, items } });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Imported ${res.code} (Total RM ${res.total.toFixed(2)})`);
      qc.invalidateQueries({ queryKey: ["fee-structures"] });
      setSelectedId(res.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { error } = await supabase.from("fee_structures").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Deleted ${pendingDelete.code}`);
      if (selectedId === pendingDelete.id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["fee-structures"] });
    }
    setPendingDelete(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">Fee Structure</h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">Manage fee templates by programme. Search, select, or import from Excel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl h-11" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
          <Button className="rounded-2xl h-11 bg-primary hover:bg-[var(--primary-hover)]" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" /> {uploading ? "Uploading…" : "Upload Excel"}
          </Button>
        </div>
      </header>

      <div className="sticky top-0 z-10 bg-background py-2 -mx-1 px-1">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-[var(--slate-text)]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code, programme or description…" className="h-11 pl-9" />
          </div>
          <Select value={selectedId ?? ""} onValueChange={(v) => setSelectedId(v || null)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Jump to fee structure…" /></SelectTrigger>
            <SelectContent>
              {filtered.length === 0 ? (
                <div className="px-2 py-3 text-sm text-[var(--slate-text)]">No matches</div>
              ) : filtered.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.programme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-[var(--border)] rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <p className="p-6 text-sm text-[var(--slate-text)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--slate-text)]">
            {structures.length === 0 ? "No fee structures yet. Download the template and upload your first structure." : "No structures match your search."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
              <tr><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Programme</th><th className="px-4 py-3 text-right">Total (RM)</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className={`border-t border-[var(--border)] cursor-pointer ${selectedId === s.id ? "bg-[var(--sky-accent)]" : "hover:bg-[var(--surface-blue)]"}`} onClick={() => setSelectedId(s.id)}>
                  <td className="px-4 py-3 font-medium">{s.code}</td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3 text-right">{Number(s.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setPendingDelete(s); }} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <div>
            <h2 className="text-xl font-semibold">{selected.code}</h2>
            <p className="text-sm text-[var(--slate-text)]">{selected.programme}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Amount (Local)</th>
                  <th className="px-3 py-2 text-right">Discount</th>
                  <th className="px-3 py-2 text-right">Net Local</th>
                  <th className="px-3 py-2 text-right">International</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={it.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{i + 1}</td>
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-right">{Number(it.amount_local).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{Number(it.discount_local).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{(Number(it.amount_local) - Number(it.discount_local)).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{Number(it.amount_international).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[var(--border)] font-semibold">
                  <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right">RM {Number(selected.total_amount).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fee structure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <b>{pendingDelete?.code}</b> and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}