import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";

export const Route = createFileRoute("/student/profile")({
  head: () => ({ meta: [{ title: "My Profile · IUC E-Pay IUC" }] }),
  component: Profile,
});

function Profile() {
  const { userId } = useIucAuth();
  const { data: p } = useQuery({
    queryKey: ["sp-profile", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("*").eq("user_id", userId!).single()).data,
  });
  if (!p) return <p className="text-[var(--slate-text)] text-sm">Loading…</p>;
  const rows: [string, string | null][] = [
    ["Student ID", p.student_id],
    ["Full Name", p.full_name],
    ["NRIC", p.nric],
    ["Email", p.email],
    ["Phone", p.phone],
    ["Programme", p.programme],
    ["Semester", p.semester],
    ["Intake", p.intake],
    ["Account Status", p.status],
  ];
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold text-primary">My Profile</h1>
        <p className="text-sm text-[var(--slate-text)] mt-1">Personal and academic information on record. Contact the Finance office to request changes.</p>
      </header>
      <div className="bg-card border border-[var(--border)] rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <dl className="divide-y divide-[var(--border)]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-6 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--slate-text)]">{k}</dt>
              <dd className="sm:col-span-2 text-sm text-foreground">{v ?? <span className="text-[var(--slate-text)]">—</span>}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}