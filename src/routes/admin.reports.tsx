import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Payment Report — E-Pay IUC Admin" }, { name: "description", content: "Download a report of student payment status." }] }),
  component: ReportsPage,
});

type Filter = "ALL" | "PAID" | "PARTIAL" | "UNPAID";

function ReportsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report"],
    queryFn: async () => {
      const [stu, ptptn, pays] = await Promise.all([
        supabase.from("student_profiles").select("id, student_id, nric, full_name, programme, semester, fee_code, total_fee, total_paid").is("deleted_at", null).order("student_id").range(0, 9999),
        supabase.from("ptptn_records").select("student_id, ptptn_amount").range(0, 9999),
        supabase.from("payments").select("student_id, amount, status, created_at").eq("status", "APPROVED").range(0, 9999),
      ]);
      if (stu.error) throw stu.error;
      const ptMap = new Map<string, number>();
      (ptptn.data ?? []).forEach((p) => ptMap.set(p.student_id.toLowerCase(), (ptMap.get(p.student_id.toLowerCase()) ?? 0) + Number(p.ptptn_amount)));
      const lastPay = new Map<string, string>();
      (pays.data ?? []).forEach((p) => { const c = lastPay.get(p.student_id); if (!c || p.created_at > c) lastPay.set(p.student_id, p.created_at); });
      return (stu.data ?? []).map((s) => {
        const total = Number(s.total_fee), paid = Number(s.total_paid), pt = ptMap.get(s.student_id.toLowerCase()) ?? 0;
        const outstanding = Math.max(total - pt - paid, 0);
        const status: Exclude<Filter, "ALL"> = outstanding <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
        return { ...s, total, paid, pt, outstanding, status, last: lastPay.get(s.id) ?? null };
      });
    },
  });

  const rows = useMemo(() => (data ?? []).filter((r) => {
    if (filter !== "ALL" && r.status !== filter) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return r.student_id.toLowerCase().includes(t) || r.full_name.toLowerCase().includes(t) || (r.programme ?? "").toLowerCase().includes(t) || (r.nric ?? "").toLowerCase().includes(t);
  }), [data, q, filter]);

  const counts = useMemo(() => {
    const c = { PAID: 0, PARTIAL: 0, UNPAID: 0 };
    (data ?? []).forEach((r) => c[r.status]++);
    return c;
  }, [data]);

  const label = (s: string) => (s === "PAID" ? "Fully Paid" : s === "PARTIAL" ? "Partially Paid" : "Unpaid");

  function download() {
    const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
      "Student ID": r.student_id, "Name": r.full_name, "NRIC": r.nric, "Programme": r.programme, "Semester": r.semester, "Fee Code": r.fee_code ?? "",
      "Total Fee (RM)": r.total, "PTPTN (RM)": r.pt, "Total Paid (RM)": r.paid, "Outstanding (RM)": r.outstanding,
      "Status": label(r.status), "Last Payment": r.last ? new Date(r.last).toLocaleDateString() : "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Payment Report");
    XLSX.writeFile(wb, `payment-report-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const badge = (s: string) => s === "PAID" ? "bg-emerald-100 text-emerald-700" : s === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">Payment Report</h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">Track which students have paid and download the report.</p>
        </div>
        <Button onClick={download} disabled={!rows.length} className="rounded-2xl h-11"><Download className="w-4 h-4 mr-2" /> Download Excel ({rows.length})</Button>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([["ALL", "All Students", data?.length ?? 0], ["PAID", "Fully Paid", counts.PAID], ["PARTIAL", "Partially Paid", counts.PARTIAL], ["UNPAID", "Unpaid", counts.UNPAID]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k)} className={`text-left bg-card border rounded-xl p-4 ${filter === k ? "border-primary ring-2 ring-primary/20" : "border-[var(--border)]"}`}>
            <div className="text-xs uppercase text-[var(--slate-text)]">{l}</div>
            <div className="text-2xl font-semibold text-primary mt-1">{n}</div>
          </button>
        ))}
      </div>
      <Input placeholder="Search by name, Student ID, NRIC, programme…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
            <tr><th className="px-4 py-3 text-left">Student ID</th><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Programme</th><th className="px-4 py-3 text-right">Total Fee</th><th className="px-4 py-3 text-right">PTPTN</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3 text-left">Status</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="p-6 text-center text-[var(--slate-text)]">Loading…</td></tr> :
              rows.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-[var(--slate-text)]">No students.</td></tr> :
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{r.student_id}</td>
                  <td className="px-4 py-3">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs">{r.programme}</td>
                  <td className="px-4 py-3 text-right">RM {r.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">RM {r.pt.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">RM {r.paid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold">RM {r.outstanding.toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${badge(r.status)}`}>{label(r.status)}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
