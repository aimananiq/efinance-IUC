import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { studentEmail } from "./iuc-auth";

const RowSchema = z.object({
  studentId: z.string().trim().min(1).max(64),
  nric: z.string().trim().min(4).max(32),
  fullName: z.string().trim().min(1).max(255),
  programme: z.string().trim().min(1).max(255),
  semester: z.string().trim().min(1).max(64),
  feeCode: z.string().trim().min(1).max(64),
  outstanding: z.number().nonnegative(),
});

const InputSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
});

export type ImportResult = {
  total: number;
  imported: number;
  failed: Array<{ row: number; studentId?: string; error: string }>;
  created: Array<{ studentId: string; fullName: string }>;
};

function normalizeRow(raw: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(raw).find((x) => x.trim().toLowerCase() === k.toLowerCase());
      if (found && raw[found] != null && String(raw[found]).trim() !== "") return String(raw[found]).trim();
    }
    return "";
  };
  const outRaw = get("OUTSTANDING", "outstanding");
  const outNum = outRaw === "" ? 0 : Number(String(outRaw).replace(/[,\s]/g, ""));
  return {
    studentId: get("STUDENT ID", "studentId", "student_id"),
    nric: get("STUDENT NRIC", "nric"),
    fullName: get("NAME", "fullName", "full_name"),
    programme: get("PROGRAMME", "programme"),
    semester: get("SEMESTER", "semester"),
    feeCode: get("FEE CODE", "feeCode", "fee_code"),
    outstanding: Number.isFinite(outNum) ? outNum : NaN,
  };
}

export const bulkImportStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ImportResult> => {
    // Verify admin role
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "ADMIN");
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const sb = supabaseAdmin;
    const result: ImportResult = { total: data.rows.length, imported: 0, failed: [], created: [] };

    const { data: existing } = await sb.from("student_profiles").select("student_id, nric");
    const existingSid = new Set((existing ?? []).map((r) => r.student_id.toLowerCase()));
    const existingNric = new Set((existing ?? []).map((r) => r.nric));
    const seenSid = new Set<string>();
    const seenNric = new Set<string>();

    // Cache fee structures by code|programme
    const fsCache = new Map<string, { id: string; items: Array<{ name: string; amount_local: number; discount_local: number; sort_order: number }> }>();
    async function loadFeeStructure(code: string, programme: string) {
      const key = `${code.toLowerCase()}|${programme.toLowerCase()}`;
      if (fsCache.has(key)) return fsCache.get(key)!;
      const { data: fs } = await sb
        .from("fee_structures").select("id, code, programme")
        .ilike("code", code).ilike("programme", programme).maybeSingle();
      if (!fs) return null;
      const { data: items } = await sb
        .from("fee_structure_items")
        .select("name, amount_local, discount_local, sort_order")
        .eq("structure_id", fs.id).order("sort_order");
      const payload = { id: fs.id, items: (items ?? []).map((x) => ({
        name: x.name, amount_local: Number(x.amount_local) || 0,
        discount_local: Number(x.discount_local) || 0, sort_order: x.sort_order,
      })) };
      fsCache.set(key, payload);
      return payload;
    }

    for (let i = 0; i < data.rows.length; i++) {
      const rowNum = i + 2; // header is row 1
      const norm = normalizeRow(data.rows[i]);
      const parsed = RowSchema.safeParse(norm);
      if (!parsed.success) {
        result.failed.push({ row: rowNum, studentId: norm.studentId, error: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
        continue;
      }
      const r = parsed.data;
      const sidKey = r.studentId.toLowerCase();
      const nricKey = r.nric.replace(/[\s-]/g, "");
      if (existingSid.has(sidKey) || seenSid.has(sidKey)) {
        result.failed.push({ row: rowNum, studentId: r.studentId, error: "Duplicate Student ID" });
        continue;
      }
      if (existingNric.has(nricKey) || seenNric.has(nricKey)) {
        result.failed.push({ row: rowNum, studentId: r.studentId, error: "Duplicate NRIC" });
        continue;
      }

      try {
        const fs = await loadFeeStructure(r.feeCode, r.programme);
        if (!fs) throw new Error(`Fee structure not found for code "${r.feeCode}" and programme "${r.programme}".`);
        if (fs.items.length === 0) throw new Error(`Fee structure "${r.feeCode}" has no items configured.`);

        const { data: u, error: ue } = await sb.auth.admin.createUser({
          email: studentEmail(r.studentId),
          password: nricKey,
          email_confirm: true,
          user_metadata: { student_id: r.studentId, role: "STUDENT" },
        });
        if (ue || !u.user) throw new Error(ue?.message ?? "Auth user create failed");
        const uid = u.user.id;

        const { error: re } = await sb.from("user_roles").insert({ user_id: uid, role: "STUDENT" });
        if (re) throw new Error("Role insert: " + re.message);

        const { data: profile, error: pe } = await sb
          .from("student_profiles")
          .insert({
            user_id: uid,
            full_name: r.fullName,
            student_id: r.studentId,
            nric: nricKey,
            email: `${r.studentId.toLowerCase()}@iuc.edu.my`,
            phone: null,
            programme: r.programme,
            semester: r.semester,
            intake: null,
            status: "ACTIVE",
          })
          .select()
          .single();
        if (pe || !profile) throw new Error("Profile insert: " + (pe?.message ?? "unknown"));

        // Build fee items from structure (using local amounts net of discount)
        const netItems = fs.items.map((it) => ({
          name: it.name,
          amount: Math.max(it.amount_local - it.discount_local, 0),
          sort_order: it.sort_order,
        }));
        const structureTotal = netItems.reduce((s, x) => s + x.amount, 0);
        // If excel OUTSTANDING < structureTotal, allocate prior payments across items
        let toCredit = Math.max(structureTotal - r.outstanding, 0);
        const feeRows = netItems.map((it) => {
          const credit = Math.min(toCredit, it.amount);
          toCredit -= credit;
          const balance = Math.max(it.amount - credit, 0);
          const status = balance === 0 ? "PAID" : credit > 0 ? "PARTIAL_PAID" : "UNPAID";
          return {
            student_id: profile.id,
            name: it.name,
            description: `${it.name} · ${r.semester}`,
            amount: it.amount,
            paid_amount: credit,
            balance,
            status,
            sort_order: it.sort_order,
            due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          };
        });
        // If outstanding > structureTotal, add an extra adjustment fee item
        if (r.outstanding > structureTotal) {
          const extra = r.outstanding - structureTotal;
          feeRows.push({
            student_id: profile.id,
            name: "Outstanding Adjustment",
            description: `Carried forward balance · ${r.semester}`,
            amount: extra,
            paid_amount: 0,
            balance: extra,
            status: "UNPAID",
            sort_order: (netItems[netItems.length - 1]?.sort_order ?? 0) + 1,
            due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          });
        }
        const { error: fie } = await sb.from("fee_items").insert(feeRows);
        if (fie) throw new Error("Fee items insert: " + fie.message);
        await sb.rpc("recalc_student_totals", { p_student_id: profile.id });

        existingSid.add(sidKey);
        existingNric.add(nricKey);
        seenSid.add(sidKey);
        seenNric.add(nricKey);
        result.imported += 1;
        result.created.push({ studentId: r.studentId, fullName: r.fullName });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.failed.push({ row: rowNum, studentId: r.studentId, error: msg });
      }
    }

    return result;
  });