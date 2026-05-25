import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/admin/students")({ component: StudentsList });

function StudentsList() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("id, student_id, full_name, programme, semester, payment_status, outstanding_balance")
        .order("student_id");
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = (data ?? []).filter((s) =>
    !q ||
    s.student_id.toLowerCase().includes(q.toLowerCase()) ||
    s.full_name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">Students</h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">{data?.length ?? 0} student accounts</p>
        </div>
        <Link to="/admin/students/import">
          <Button className="rounded-2xl bg-primary hover:bg-[var(--primary-hover)] h-11">
            <Upload className="w-4 h-4 mr-2" /> Bulk Import (CSV)
          </Button>
        </Link>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{s.student_id}</td>
                  <td className="px-4 py-3">{s.full_name}</td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3">{s.semester}</td>
                  <td className="px-4 py-3">{s.payment_status}</td>
                  <td className="px-4 py-3 text-right">RM {Number(s.outstanding_balance).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}