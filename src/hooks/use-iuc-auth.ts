import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type IucRole = "STUDENT" | "ADMIN" | null;

export function useIucAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<IucRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setRole(null); setLoading(false); return; }
      setTimeout(async () => {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id).maybeSingle();
        setRole((data?.role as IucRole) ?? null);
        setLoading(false);
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, role, loading, userId: session?.user.id ?? null };
}