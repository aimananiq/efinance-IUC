import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { studentEmail, adminEmail } from "./iuc-auth";

/**
 * Idempotent seed: creates the demo admin + 5 demo students with fee items,
 * sample payments and notifications. Safe to call multiple times.
 */
export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = supabaseAdmin;

  // Check if already seeded
  const { count: adminCount } = await supabase
    .from("admin_profiles")
    .select("*", { count: "exact", head: true });
  if ((adminCount ?? 0) > 0) {
    return { ok: true, alreadySeeded: true };
  }

  // --- 1. Admin ---
  const adminEmailAddr = adminEmail("admin");
  const { data: adminUser, error: aErr } = await supabase.auth.admin.createUser({
    email: adminEmailAddr,
    password: "admin123",
    email_confirm: true,
    user_metadata: { username: "admin", role: "ADMIN" },
  });
  if (aErr) throw new Error("Admin create failed: " + aErr.message);
  const adminId = adminUser.user!.id;
  await supabase.from("user_roles").insert({ user_id: adminId, role: "ADMIN" });
  await supabase.from("admin_profiles").insert({
    user_id: adminId,
    username: "admin",
    full_name: "IUC Finance Admin",
  });

  // --- 2. Students ---
  const students = [
    { sid: "IUC2024001", nric: "020101011234", name: "Ahmad bin Ismail", programme: "BSc Computer Science", semester: "Semester 3", intake: "Sept 2024", phone: "+60123456701" },
    { sid: "IUC2024002", nric: "030202022345", name: "Siti Nurhaliza", programme: "BBA Marketing", semester: "Semester 2", intake: "Sept 2024", phone: "+60123456702" },
    { sid: "IUC2024003", nric: "010303033456", name: "Tan Wei Ming", programme: "BEng Mechanical", semester: "Semester 4", intake: "Mar 2024", phone: "+60123456703" },
    { sid: "IUC2024004", nric: "020404044567", name: "Priya Devi", programme: "BSc Accounting", semester: "Semester 1", intake: "Mar 2025", phone: "+60123456704" },
    { sid: "IUC2024005", nric: "030505055678", name: "Lim Jia Hui", programme: "BSc Information Tech", semester: "Semester 3", intake: "Sept 2024", phone: "+60123456705" },
  ];

  const feeTemplate = [
    { name: "Registration Fee", amount: 500, order: 1 },
    { name: "Tuition Fee", amount: 6500, order: 2 },
    { name: "Exam Fee", amount: 350, order: 3 },
    { name: "Library Fee", amount: 150, order: 4 },
    { name: "Miscellaneous Fee", amount: 200, order: 5 },
  ];

  for (const s of students) {
    const { data: u, error } = await supabase.auth.admin.createUser({
      email: studentEmail(s.sid),
      password: s.nric,
      email_confirm: true,
      user_metadata: { student_id: s.sid, role: "STUDENT" },
    });
    if (error) throw new Error(`Student ${s.sid} create failed: ${error.message}`);
    const uid = u.user!.id;
    await supabase.from("user_roles").insert({ user_id: uid, role: "STUDENT" });
    const { data: profile } = await supabase
      .from("student_profiles")
      .insert({
        user_id: uid,
        full_name: s.name,
        student_id: s.sid,
        nric: s.nric,
        email: `${s.sid.toLowerCase()}@iuc.edu.my`,
        phone: s.phone,
        programme: s.programme,
        semester: s.semester,
        intake: s.intake,
      })
      .select()
      .single();

    if (!profile) continue;

    const rows = feeTemplate.map((f) => ({
      student_id: profile.id,
      name: f.name,
      description: `${f.name} for ${s.semester}`,
      amount: f.amount,
      balance: f.amount,
      sort_order: f.order,
      due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    }));
    await supabase.from("fee_items").insert(rows);
    await supabase.rpc("recalc_student_totals", { p_student_id: profile.id });
  }

  return { ok: true, alreadySeeded: false, admin: "admin / admin123", students: students.map((s) => `${s.sid} / ${s.nric}`) };
});