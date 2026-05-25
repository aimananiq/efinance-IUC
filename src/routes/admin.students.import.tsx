import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { bulkImportStudents, type ImportResult } from "@/lib/bulk-import.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/students/import")({ component: ImportPage });

const SAMPLE_CSV = `fullName,studentId,nric,email,phone,programme,semester,intake,status
Aisha binti Rahman,IUC2024010,040101011234,aisha@example.com,+60123456710,BSc Computer Science,Semester 1,Sept 2024,ACTIVE
Daniel Tan,IUC2024011,030202022345,daniel@example.com,+60123456711,BBA Marketing,Semester 2,Mar 2024,ACTIVE
`;

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

function ImportPage() {
  const importFn = useServerFn(bulkImportStudents);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function onUpload() {
    if (!file) return toast.error("Please choose a CSV file first.");
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("File must be a .csv");
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("CSV has no data rows.");
        return;
      }
      if (rows.length > 500) {
        toast.error("Maximum 500 rows per upload.");
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
        <p className="text-sm text-[var(--slate-text)] mt-2">Upload a CSV file to create multiple student accounts at once. Their NRIC is used as the default password.</p>
      </header>

      <div className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="font-semibold mb-1">Step 1 · Get the template</h2>
          <p className="text-sm text-[var(--slate-text)] mb-3">
            Required columns: <code>fullName, studentId, nric, email, phone, programme, semester, intake, status</code>
          </p>
          <Button variant="outline" onClick={downloadSample}><Download className="w-4 h-4 mr-2" />Download sample CSV</Button>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <h2 className="font-semibold mb-1">Step 2 · Upload</h2>
          <input
            type="file"
            accept=".csv,text/csv"
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