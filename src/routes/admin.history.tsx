import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/history")({
  head: () => ({ meta: [{"title": "Audit History — E-Pay IUC"}, {"name": "description", "content": "Audit History for Innovative University College’s E-Pay portal."}, {"property": "og:title", "content": "Audit History — E-Pay IUC"}, {"property": "og:description", "content": "Audit History for Innovative University College’s E-Pay portal."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}] }),
  component: HistoryPage });

function HistoryPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const filtered = (data ?? []).filter((a: any) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return a.action.toLowerCase().includes(t) || a.entity_type.toLowerCase().includes(t) || (a.entity_id ?? "").toLowerCase().includes(t);
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Audit History</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">Recent admin actions and system events.</p>
      </header>
      <Input placeholder="Search by action, entity type, or entity ID…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 max-w-md" />
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-x-auto" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--slate-text)]">
            <tr><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-left">Entity</th><th className="px-4 py-3 text-left">Entity ID</th><th className="px-4 py-3 text-left">Details</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-[var(--slate-text)]">Loading…</td></tr> :
              filtered.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-[var(--slate-text)]">No logs.</td></tr> :
              filtered.map((a: any) => (
                <tr key={a.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-4 py-3 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{a.action}</td>
                  <td className="px-4 py-3 text-xs">{a.entity_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.entity_id ?? "—"}</td>
                  <td className="px-4 py-3 text-xs"><pre className="whitespace-pre-wrap text-[10px] text-[var(--slate-text)]">{a.new_value ? JSON.stringify(a.new_value, null, 0) : "—"}</pre></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}