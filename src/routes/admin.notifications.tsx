import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIucAuth } from "@/hooks/use-iuc-auth";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { userId } = useIucAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifs", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", userId!).order("created_at", { ascending: false })).data ?? [],
  });
  const filtered = (data ?? []).filter((n: any) => filter === "ALL" || (filter === "UNREAD" ? !n.is_read : n.is_read));

  async function markRead(id: string) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-notifs"] });
  }
  async function markAllRead() {
    if (!userId) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (error) return toast.error(error.message);
    toast.success("All marked as read");
    qc.invalidateQueries({ queryKey: ["admin-notifs"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">Notifications</h1>
          <p className="text-sm text-[var(--slate-text)] mt-2">Activity that needs your attention.</p>
        </div>
        <Button variant="outline" onClick={markAllRead}>Mark all as read</Button>
      </header>
      <div className="flex gap-2">
        {(["ALL", "UNREAD", "READ"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-[var(--surface-muted)] text-foreground"}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-[var(--slate-text)]">Loading…</p> :
          filtered.length === 0 ? <p className="text-sm text-[var(--slate-text)]">No notifications.</p> :
          filtered.map((n: any) => (
            <div key={n.id} className={`bg-card border rounded-xl p-4 flex justify-between gap-4 ${n.is_read ? "border-[var(--border)] opacity-70" : "border-[var(--primary-accent)]"}`} style={{ boxShadow: "var(--shadow-card)" }}>
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-[var(--slate-text)] mt-0.5">{n.message}</p>
                <p className="text-xs text-[var(--slate-text)] mt-1">{new Date(n.created_at).toLocaleString()} · {n.type}</p>
              </div>
              {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
            </div>
          ))}
      </div>
    </div>
  );
}