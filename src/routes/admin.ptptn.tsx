import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { upsertPtptn, deletePtptn, bulkImportPtptn, type BulkPtptnResult } from "@/lib/ptptn.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Upload, Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/ptptn")({
  head: () => ({ meta: [{"title": "PTPTN Management — E-Pay IUC"}, {"name": "description", "content": "PTPTN Management for Innovative University College’s E-Pay portal."}, {"property": "og:title", "content": "PTPTN Management — E-Pay IUC"}, {"property": "og:description", "content": "PTPTN Management for Innovative University College’s E-Pay portal."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
  component: PtptnPage });

type PtptnRow = {
  id: string; student_id: string; student_name: string; programme: string;
  total_fee: number; ptptn_amount: number;
};

const PAGE_SIZE = 10;
const fmtRM = (n: number) =>
  "RM " + (Number(n) || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusOf(total: number, ptptn: number): "Fully Covered" | "Partial" | "No PTPTN" {
  if (ptptn <= 0) return "No PTPTN";
  if (ptptn >= total && total > 0) return "Fully Covered";
  return "Partial";
}

function StatusBadge({ status }: { status: "Fully Covered" | "Partial" | "No PTPTN" }) {
  const cls =
    status === "Fully Covered" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : status === "Partial" ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{status}</span>;
}

function PtptnPage() {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertPtptn);
  const deleteFn = useServerFn(deletePtptn);
  const bulkFn = useServerFn(bulkImportPtptn);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Fully Covered" | "Partial" | "No PTPTN">("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PtptnRow | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PtptnRow | null>(null);
  const [openBulk, setOpenBulk] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ptptn-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ptptn_records")
        .select("id, student_id, student_name, programme, total_fee, ptptn_amount")
        .order("student_id");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        total_fee: Number(r.total_fee),
        ptptn_amount: Number(r.ptptn_amount),
      })) as PtptnRow[];
    },
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && statusOf(r.total_fee, r.ptptn_amount) !== statusFilter) return false;
      if (!q) return true;
      const t = q.toLowerCase();
      return (
        r.student_id.toLowerCase().includes(t) ||
        r.student_name.toLowerCase().includes(t) ||
        (r.programme ?? "").toLowerCase().includes(t)
      );
    });
  }, [data, q, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete() {
    if (!pendingDelete) return;
    const res = await deleteFn({ data: { id: pendingDelete.id } });
    if (!res.ok) toast.error(res.error ?? "Delete failed");
    else { toast.success(`Removed PTPTN for ${pendingDelete.student_id}`); qc.invalidateQueries({ queryKey: ["ptptn-records"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); }
    setPendingDelete(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary flex items-center gap-3">
            <GraduationCap className="w-8 h-8" /> PTPTN Management
          </h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">{data?.length ?? 0} student PTPTN records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/templates/PTPTN-template.xlsx" download="PTPTN-template.xlsx">
            <Button variant="outline" type="button" className="rounded-2xl h-11">
              <Download className="w-4 h-4 mr-2" /> Download Template
            </Button>
          </a>
          <Button variant="outline" className="rounded-2xl h-11" onClick={() => setOpenBulk(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
          </Button>
          <Button className="rounded-2xl bg-primary hover:bg-[var(--primary-hover)] h-11"
            onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="Search by name, student ID, or programme…"
          value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="h-11 max-w-md" />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
          <SelectTrigger className="h-11 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="Fully Covered">Fully Covered</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
            <SelectItem value="No PTPTN">No PTPTN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <p className="p-6 text-sm text-[var(--slate-text)]">Loading…</p>
        ) : pageRows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--slate-text)]">No PTPTN records found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)]">
              <tr className="text-xs uppercase text-[var(--slate-text)] text-left">
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Programme / Course</th>
                <th className="px-4 py-3 text-right">Total Fee</th>
                <th className="px-4 py-3 text-right">PTPTN Amount</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const outstanding = Math.max(r.total_fee - r.ptptn_amount, 0);
                const status = statusOf(r.total_fee, r.ptptn_amount);
                return (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3 font-medium">{r.student_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.student_id}</td>
                    <td className="px-4 py-3">{r.programme || "—"}</td>
                    <td className="px-4 py-3 text-right">{fmtRM(r.total_fee)}</td>
                    <td className="px-4 py-3 text-right">{fmtRM(r.ptptn_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtRM(outstanding)}</td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button className="text-primary hover:text-[var(--primary-hover)]"
                          aria-label={`Edit ${r.student_id}`}
                          onClick={() => { setEditing(r); setOpenForm(true); }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="text-destructive hover:text-destructive/80"
                          aria-label={`Delete ${r.student_id}`}
                          onClick={() => setPendingDelete(r)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-[var(--slate-text)]">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-[var(--slate-text)]">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <PtptnFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        initial={editing}
        onSave={async (payload) => {
          const res = await upsertFn({ data: payload });
          if (!res.ok) { toast.error(res.error ?? "Save failed"); return false; }
          toast.success(editing ? "PTPTN record updated" : "PTPTN record added");
          qc.invalidateQueries({ queryKey: ["ptptn-records"] });
          qc.invalidateQueries({ queryKey: ["admin-stats"] });
          return true;
        }}
      />

      <BulkUploadDialog
        open={openBulk}
        onOpenChange={setOpenBulk}
        onImport={async (rows) => {
          const res = await bulkFn({ data: { rows } }) as BulkPtptnResult;
          if (res.imported > 0) toast.success(`${res.imported} of ${res.total} records imported${res.failed.length ? `, ${res.failed.length} errors` : ""}`);
          else toast.error(`Import failed${res.failed.length ? ` — ${res.failed.length} errors` : ""}`);
          qc.invalidateQueries({ queryKey: ["ptptn-records"] });
          qc.invalidateQueries({ queryKey: ["admin-stats"] });
          return res;
        }}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this PTPTN record?</AlertDialogTitle>
            <AlertDialogDescription>
              The PTPTN record for <b>{pendingDelete?.student_name}</b> ({pendingDelete?.student_id}) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PtptnFormDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: PtptnRow | null;
  onSave: (p: { id?: string; student_id: string; student_name: string; programme: string; total_fee: number; ptptn_amount: number }) => Promise<boolean>;
}) {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [programme, setProgramme] = useState("");
  const [totalFee, setTotalFee] = useState("");
  const [ptptn, setPtptn] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookupHint, setLookupHint] = useState<string | null>(null);

  // sync on open
  useMemo(() => {
    if (open) {
      setStudentId(initial?.student_id ?? "");
      setStudentName(initial?.student_name ?? "");
      setProgramme(initial?.programme ?? "");
      setTotalFee(initial ? String(initial.total_fee) : "");
      setPtptn(initial ? String(initial.ptptn_amount) : "");
      setLookupHint(null);
    }
  }, [open, initial]);

  async function lookupStudent() {
    if (!studentId.trim()) return;
    const { data } = await supabase
      .from("student_profiles")
      .select("full_name, programme, total_fee")
      .ilike("student_id", studentId.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (data) {
      if (!studentName) setStudentName(data.full_name);
      if (!programme) setProgramme(data.programme);
      if (!totalFee || Number(totalFee) === 0) setTotalFee(String(Number(data.total_fee)));
      setLookupHint(`Linked to existing student • Total Fee: ${fmtRM(Number(data.total_fee))}`);
    } else {
      setLookupHint("No existing student record — enter details manually.");
    }
  }

  const totalNum = Number(totalFee) || 0;
  const ptptnNum = Number(ptptn) || 0;
  const outstanding = Math.max(totalNum - ptptnNum, 0);

  async function submit() {
    if (!studentId.trim() || !studentName.trim()) {
      toast.error("Student ID and Name are required");
      return;
    }
    if (totalNum < 0 || ptptnNum < 0) { toast.error("Amounts must be non-negative"); return; }
    setSaving(true);
    const ok = await onSave({
      id: initial?.id,
      student_id: studentId.trim(),
      student_name: studentName.trim(),
      programme: programme.trim(),
      total_fee: totalNum,
      ptptn_amount: ptptnNum,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit PTPTN Record" : "Add PTPTN Record"}</DialogTitle>
          <DialogDescription>Outstanding balance is calculated automatically as Total Fee minus PTPTN amount.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-2">
              <Label htmlFor="sid">Student ID</Label>
              <Input id="sid" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. IUC2024001" />
            </div>
            <Button type="button" variant="outline" onClick={lookupStudent} disabled={!studentId.trim()}>Lookup</Button>
          </div>
          {lookupHint && <p className="text-xs text-[var(--slate-text)]">{lookupHint}</p>}
          <div className="space-y-2">
            <Label htmlFor="sname">Student Name</Label>
            <Input id="sname" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prog">Programme / Course</Label>
            <Input id="prog" value={programme} onChange={(e) => setProgramme(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tot">Total Fee (RM)</Label>
              <Input id="tot" type="number" inputMode="decimal" step="0.01" min="0"
                value={totalFee} onChange={(e) => setTotalFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ptptn">PTPTN Amount (RM)</Label>
              <Input id="ptptn" type="number" inputMode="decimal" step="0.01" min="0"
                value={ptptn} onChange={(e) => setPtptn(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-[var(--slate-text)]">Outstanding Balance</span>
            <span className="font-semibold text-primary">{fmtRM(outstanding)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-primary hover:bg-[var(--primary-hover)]">
            {saving ? "Saving…" : initial ? "Save Changes" : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ParsedRow = { student_name: string; student_id: string; programme: string; total_fee: number; ptptn_amount: number };

function BulkUploadDialog({ open, onOpenChange, onImport }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (rows: ParsedRow[]) => Promise<BulkPtptnResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function reset() { setFile(null); setPreview(null); setErrors([]); }

  async function parseFile(f: File) {
    setErrors([]);
    setPreview(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
      const required = ["STUDENT NAME", "STUDENT ID", "PROGRAMME", "TOTAL FEE", "PTPTN AMOUNT"];
      const headers = Object.keys(rows[0] ?? {}).map((h) => h.trim().toUpperCase());
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length) { setErrors([`Missing required columns: ${missing.join(", ")}`]); return; }
      const errs: string[] = [];
      const parsed: ParsedRow[] = [];
      const get = (r: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
          if (found && r[found] != null && String(r[found]).trim() !== "") return String(r[found]).trim();
        }
        return "";
      };
      rows.forEach((r, i) => {
        const row = i + 2;
        const student_name = get(r, "STUDENT NAME", "NAME");
        const student_id = get(r, "STUDENT ID");
        const programme = get(r, "PROGRAMME", "PROGRAM", "COURSE");
        const total_fee = Number(String(get(r, "TOTAL FEE")).replace(/[,\s]/g, "")) || 0;
        const ptptn_amount = Number(String(get(r, "PTPTN AMOUNT")).replace(/[,\s]/g, "")) || 0;
        if (!student_name || !student_id) { errs.push(`Row ${row}: missing name or student ID`); return; }
        parsed.push({ student_name, student_id, programme, total_fee, ptptn_amount });
      });
      setPreview(parsed);
      setErrors(errs);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not read file"]);
    }
  }

  async function confirmImport() {
    if (!preview || preview.length === 0) return;
    setLoading(true);
    try { await onImport(preview); reset(); onOpenChange(false); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload PTPTN</DialogTitle>
          <DialogDescription>
            Upload a .xlsx file using the PTPTN template. Outstanding balance is calculated automatically for each row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <a href="/templates/PTPTN-template.xlsx" download="PTPTN-template.xlsx">
              <Button variant="outline" type="button"><Download className="w-4 h-4 mr-2" />Download Template</Button>
            </a>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) parseFile(f); }}
              className="block text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--sky-accent)] file:text-[var(--primary-accent)]"
            />
          </div>

          {errors.length > 0 && (
            <ul className="text-sm text-destructive space-y-1 max-h-40 overflow-auto bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}

          {preview && preview.length > 0 && (
            <div className="border border-[var(--border)] rounded-xl overflow-x-auto">
              <div className="px-4 py-2 text-xs text-[var(--slate-text)] bg-[var(--surface-muted)] flex items-center justify-between">
                <span>{preview.length} rows ready to import</span>
                <span>Outstanding shown is computed from Total Fee − PTPTN</span>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface-muted)] sticky top-0">
                    <tr className="text-xs uppercase text-[var(--slate-text)] text-left">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Programme</th>
                      <th className="px-3 py-2 text-right">Total Fee</th>
                      <th className="px-3 py-2 text-right">PTPTN</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">{r.student_name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{r.student_id}</td>
                        <td className="px-3 py-2">{r.programme || "—"}</td>
                        <td className="px-3 py-2 text-right">{fmtRM(r.total_fee)}</td>
                        <td className="px-3 py-2 text-right">{fmtRM(r.ptptn_amount)}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmtRM(Math.max(r.total_fee - r.ptptn_amount, 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={confirmImport} disabled={loading || !preview || preview.length === 0}
            className="bg-primary hover:bg-[var(--primary-hover)]">
            <Upload className="w-4 h-4 mr-2" />{loading ? "Importing…" : `Confirm Import${preview ? ` (${preview.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}