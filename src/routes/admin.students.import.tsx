import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { bulkImportStudents, type ImportResult } from "@/lib/bulk-import.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/students/import")({ component: ImportPage });

const TEMPLATE_URL = "/templates/Student-template.xlsx";

async function parseWorkbook(file: File): Promise<Array<Record<string, string>>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  return rows.map((r) => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(r)) out[k] = r[k] == null ? "" : String(r[k]);
    return out;
  });
}

function ImportPage() {
  const importFn = useServerFn(bulkImportStudents);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onUpload() {
    if (!file) return toast.error("Please choose an Excel file first.");
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return toast.error("File must be a .xlsx or .xls Excel file");
    }
    setLoading(true);
    setResult(null);
    try {
      const rows = await parseWorkbook(file);
      if (rows.length === 0) {
        toast.error("Excel file has no data rows.");
        return;
      }
      if (rows.length > 500) {
        toast.error("Maximum 500 rows per upload.");
        return;
      }
      // Validate template has the expected headers
      const required = ["STUDENT ID", "STUDENT NRIC", "NAME", "PROGRAMME", "SEMESTER", "FEE CODE", "OUTSTANDING"];
      const headers = Object.keys(rows[0]).map((h) => h.trim().toUpperCase());
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length > 0) {
        toast.error(`Invalid template. Missing columns: ${missing.join(", ")}`);
        return;
      }
      const res = await importFn({ data: { rows } });
      setResult(res);
      if (res.imported > 0) toast.success(`Imported ${res.imported} of ${res.total} students`);
      else toast.error("No rows were imported. See details below.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/admin/students" className="inline-flex items-center text-sm text-[var(--slate-text)] hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to students
      </Link>
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Bulk Import Students</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">
          Upload the official Student Excel template to create multiple student accounts at once.
          Each student's NRIC becomes their portal password. Fee items are generated from the fee structure
          matched by <b>FEE CODE</b> + <b>PROGRAMME</b>.
        </p>
      </header>

      <div className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="font-semibold mb-1">Step 1 · Get the template</h2>
          <p className="text-sm text-[var(--slate-text)] mb-3">
            Required columns (in this exact order): <code>STUDENT ID, STUDENT NRIC, NAME, PROGRAMME, SEMESTER, FEE CODE, OUTSTANDING</code>
          </p>
          <a href={TEMPLATE_URL} download="Student-template.xlsx">
            <Button variant="outline" type="button"><Download className="w-4 h-4 mr-2" />Download Student Template</Button>
          </a>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <h2 className="font-semibold mb-1">Step 2 · Upload</h2>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block text-sm mt-2 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--sky-accent)] file:text-[var(--primary-accent)]"
          />
          <Button onClick={onUpload} disabled={loading || !file} className="mt-4 rounded-2xl bg-primary hover:bg-[var(--primary-hover)] h-11">
            <Upload className="w-4 h-4 mr-2" />{loading ? "Importing…" : "Import Students"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="text-lg font-semibold">Import Result</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-[var(--slate-text)]">Total</p><p className="text-2xl font-semibold">{result.total}</p></div>
            <div><p className="text-[var(--slate-text)]">Imported</p><p className="text-2xl font-semibold text-emerald-600">{result.imported}</p></div>
            <div><p className="text-[var(--slate-text)]">Failed</p><p className="text-2xl font-semibold text-destructive">{result.failed.length}</p></div>
          </div>
          {result.created.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Imported Successfully</h3>
              <ul className="text-sm space-y-1 max-h-48 overflow-auto">
                {result.created.map((c) => <li key={c.studentId}>✓ {c.studentId} — {c.fullName}</li>)}
              </ul>
            </div>
          )}
          {result.failed.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 text-destructive">Failed Rows</h3>
              <ul className="text-sm space-y-1 max-h-64 overflow-auto">
                {result.failed.map((f, i) => (
                  <li key={i} className="text-destructive">Row {f.row}{f.studentId ? ` (${f.studentId})` : ""}: {f.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}