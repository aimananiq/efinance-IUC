import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { studentEmail } from "./iuc-auth";

const RowSchema = z.object({
  fullName: z.string().trim().min(1),
  studentId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "studentId must be alphanumeric"),
  nric: z.string().trim().min(6).max(32),
  email: z.string().trim().email().optional().or(z.literal("")).optional(),
  phone: z.string().trim().max(32).optional().or(z.literal("")).optional(),
  programme: z.string().trim().min(1),
  semester: z.string().trim().min(1),
  intake: z.string().trim().optional().or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional().default("ACTIVE"),
});

const InputSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
});

const DEFAULT_FEES = [
  { name: "Registration Fee", amount: 500, order: 1 },
  { name: "Tuition Fee", amount: 6500, order: 2 },
  { name: "Exam Fee", amount: 350, order: 3 },
  { name: "Library Fee", amount: 150, order: 4 },
  { name: "Miscellaneous Fee", amount: 200, order: 5 },
];

export type ImportResult = {
  total: number;
  imported: number;
  failed: Array<{ row: number; studentId?: string; error: string }>;
  created: Array<{ studentId: string; fullName: string }>;
};

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

    // Pre-fetch existing student_ids and nrics to detect dupes
    const { data: existing } = await sb.from("student_profiles").select("student_id, nric");
    const existingSid = new Set((existing ?? []).map((r) => r.student_id.toLowerCase()));
    const existingNric = new Set((existing ?? []).map((r) => r.nric));
    const seenSid = new Set<string>();
    const seenNric = new Set<string>();

    for (let i = 0; i < data.rows.length; i++) {
      const rowNum = i + 2; // header is row 1
      const raw = data.rows[i];
      const parsed = RowSchema.safeParse(raw);
      if (!parsed.success) {
        result.failed.push({ row: rowNum, studentId: raw.studentId, error: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
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
            email: r.email || `${r.studentId.toLowerCase()}@iuc.edu.my`,
            phone: r.phone || null,
            programme: r.programme,
            semester: r.semester,
            intake: r.intake || null,
            status: r.status ?? "ACTIVE",
          })
          .select()
          .single();
        if (pe || !profile) throw new Error("Profile insert: " + (pe?.message ?? "unknown"));

        const fees = DEFAULT_FEES.map((f) => ({
          student_id: profile.id,
          name: f.name,
          description: `${f.name} for ${r.semester}`,
          amount: f.amount,
          balance: f.amount,
          sort_order: f.order,
          due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        }));
        await sb.from("fee_items").insert(fees);
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