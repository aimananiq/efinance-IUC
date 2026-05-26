import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteStudent } from "@/lib/fee-structure.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Upload, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/admin/students/")({ component: StudentsList });

function StudentsList() {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteStudent);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<{ id: string; name: string; sid: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("id, student_id, nric, full_name, programme, semester, fee_code, payment_status, outstanding_balance, deleted_at")
        .is("deleted_at", null)
        .order("student_id");
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = (data ?? []).filter((s) =>
    !q ||
    s.student_id.toLowerCase().includes(q.toLowerCase()) ||
    s.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (s.nric ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (s.fee_code ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      const res = await delFn({ data: { studentProfileId: pending.id } });
      if (!res.ok) toast.error(res.error ?? "Failed to delete student");
      else { toast.success(`Deleted ${pending.sid}`); qc.invalidateQueries({ queryKey: ["admin-students"] }); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeleting(false); setPending(null); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">Students</h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">{data?.length ?? 0} student accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/templates/Student-template.xlsx" download="Student-template.xlsx">
            <Button variant="outline" type="button" className="rounded-2xl h-11">
              <Download className="w-4 h-4 mr-2" /> Download Student Template
            </Button>
          </a>
          <Link to="/admin/students/import">
            <Button className="rounded-2xl bg-primary hover:bg-[var(--primary-hover)] h-11">
              <Upload className="w-4 h-4 mr-2" /> Bulk Import (Excel)
            </Button>
          </Link>
        </div>
      </header>
      <Input placeholder="Search by name or Student ID…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <p className="p-6 text-sm text-[var(--slate-text)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--slate-text)]">No students found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)]">
              <tr className="text-xs uppercase text-[var(--slate-text)] text-left">
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Student NRIC</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Fee Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{s.student_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.nric ?? "—"}</td>
                  <td className="px-4 py-3">{s.full_name}</td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3">{s.semester}</td>
                  <td className="px-4 py-3">
                    {s.fee_code ? (
                      <span className="inline-flex items-center rounded-md bg-[var(--sky-accent)] text-[var(--primary-accent)] px-2 py-0.5 text-xs font-medium">
                        {s.fee_code}
                      </span>
                    ) : (
                      <span className="text-[var(--slate-text)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.payment_status}</td>
                  <td className="px-4 py-3 text-right">RM {Number(s.outstanding_balance).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setPending({ id: s.id, name: s.full_name, sid: s.student_id })}
                      className="text-destructive hover:text-destructive/80"
                      aria-label={`Delete ${s.student_id}`}
                    ><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              <b>{pending?.name}</b> ({pending?.sid}) will be deactivated and removed from the active student list. Their payment and audit history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Deleting…" : "Delete Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}