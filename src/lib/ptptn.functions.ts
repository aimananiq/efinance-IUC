import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r) => r.role === "ADMIN")) throw new Error("Forbidden: admin role required");
}

const UpsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  student_id: z.string().trim().min(1).max(64),
  student_name: z.string().trim().min(1).max(255),
  programme: z.string().trim().max(255).default(""),
  total_fee: z.number().nonnegative(),
  ptptn_amount: z.number().nonnegative(),
});

export type PtptnResult = { ok: true; id: string } | { ok: false; error: string };

export const upsertPtptn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }): Promise<PtptnResult> => {
    try {
      await assertAdmin(context.userId);
      // Auto-link total_fee from existing student profile if available and total_fee = 0
      let totalFee = data.total_fee;
      const { data: sp } = await supabaseAdmin
        .from("student_profiles")
        .select("id, total_fee, programme, full_name")
        .ilike("student_id", data.student_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (sp && totalFee === 0) totalFee = Number(sp.total_fee) || 0;

      const payload = {
        student_id: data.student_id,
        student_name: data.student_name,
        programme: data.programme || (sp?.programme ?? ""),
        total_fee: totalFee,
        ptptn_amount: data.ptptn_amount,
      };

      if (data.id) {
        const { error } = await supabaseAdmin.from("ptptn_records").update(payload).eq("id", data.id);
        if (error) return { ok: false, error: error.message };
        return { ok: true, id: data.id };
      }
      const { data: ins, error } = await supabaseAdmin
        .from("ptptn_records")
        .upsert(payload, { onConflict: "student_id" })
        .select("id")
        .single();
      if (error || !ins) return { ok: false, error: error?.message ?? "Insert failed" };
      return { ok: true, id: ins.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

export const deletePtptn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await assertAdmin(context.userId);
      const { error } = await supabaseAdmin.from("ptptn_records").delete().eq("id", data.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

const BulkRow = z.object({
  student_name: z.string().trim().min(1).max(255),
  student_id: z.string().trim().min(1).max(64),
  programme: z.string().trim().max(255).default(""),
  total_fee: z.number().nonnegative(),
  ptptn_amount: z.number().nonnegative(),
});
const BulkInput = z.object({ rows: z.array(BulkRow).min(1).max(1000) });

export type BulkPtptnResult = {
  total: number;
  imported: number;
  failed: Array<{ row: number; student_id?: string; error: string }>;
};

export const bulkImportPtptn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkInput.parse(d))
  .handler(async ({ data, context }): Promise<BulkPtptnResult> => {
    await assertAdmin(context.userId);
    const out: BulkPtptnResult = { total: data.rows.length, imported: 0, failed: [] };
    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const { error } = await supabaseAdmin
        .from("ptptn_records")
        .upsert(r, { onConflict: "student_id" });
      if (error) out.failed.push({ row: i + 2, student_id: r.student_id, error: error.message });
      else out.imported += 1;
    }
    return out;
  });