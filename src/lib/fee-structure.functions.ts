import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r) => r.role === "ADMIN")) throw new Error("Forbidden: admin role required");
}

const ItemSchema = z.object({
  name: z.string().trim().min(1).max(255),
  amount_local: z.number().nonnegative().default(0),
  amount_international: z.number().nonnegative().default(0),
  discount_local: z.number().nonnegative().default(0),
  discount_international: z.number().nonnegative().default(0),
});

const ImportInput = z.object({
  code: z.string().trim().min(1).max(64),
  programme: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  items: z.array(ItemSchema).min(1).max(50),
});

export type ImportFsResult = { ok: true; id: string; code: string; total: number } | { ok: false; error: string };

export const importFeeStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data, context }): Promise<ImportFsResult> => {
    try {
      await assertAdmin(context.userId);
      const { data: existing } = await supabaseAdmin
        .from("fee_structures").select("id").eq("code", data.code).maybeSingle();
      if (existing) return { ok: false, error: `Fee structure code "${data.code}" already exists` };

      const total = data.items.reduce((s, it) => s + (it.amount_local - it.discount_local), 0);
      const { data: fs, error: fe } = await supabaseAdmin
        .from("fee_structures")
        .insert({ code: data.code, programme: data.programme, description: data.description ?? null, total_amount: total })
        .select().single();
      if (fe || !fs) return { ok: false, error: fe?.message ?? "Insert failed" };

      const rows = data.items.map((it, i) => ({ structure_id: fs.id, sort_order: i + 1, ...it }));
      const { error: ie } = await supabaseAdmin.from("fee_structure_items").insert(rows);
      if (ie) {
        await supabaseAdmin.from("fee_structures").delete().eq("id", fs.id);
        return { ok: false, error: "Items insert: " + ie.message };
      }
      return { ok: true, id: fs.id, code: fs.code, total };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ studentProfileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await assertAdmin(context.userId);
      const { data: sp, error: se } = await supabaseAdmin
        .from("student_profiles").select("id, user_id, deleted_at").eq("id", data.studentProfileId).maybeSingle();
      if (se) return { ok: false, error: se.message };
      if (!sp) return { ok: false, error: "Student not found" };
      if (sp.deleted_at) return { ok: false, error: "Student already deleted" };

      // Soft delete profile
      const { error: ue } = await supabaseAdmin
        .from("student_profiles")
        .update({ deleted_at: new Date().toISOString(), status: "INACTIVE" })
        .eq("id", sp.id);
      if (ue) return { ok: false, error: ue.message };

      // Disable auth user (do not delete to preserve audit trail)
      try { await supabaseAdmin.auth.admin.updateUserById(sp.user_id, { ban_duration: "876000h" } as any); } catch {}
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });