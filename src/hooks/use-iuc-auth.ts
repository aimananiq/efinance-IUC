import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type IucRole = "STUDENT" | "ADMIN" | null;

export function useIucAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<IucRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function refresh(s: Session | null) {
      const current = ++revision;
      setSession(s); setRole(null); setLoading(Boolean(s));
      if (!s) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).maybeSingle();
      if (!active || current !== revision) return;
      setRole(data?.role === "ADMIN" || data?.role === "STUDENT" ? data.role : null);
      setLoading(false);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => { if (active) void refresh(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active && revision === 0) void refresh(data.session);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, role, loading, userId: session?.user.id ?? null };
}