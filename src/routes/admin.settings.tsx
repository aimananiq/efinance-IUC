import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIucAuth } from "@/hooks/use-iuc-auth";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { userId } = useIucAuth();
  const { data } = useQuery({
    queryKey: ["app-settings-admin"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", "global").maybeSingle()).data,
  });

  const [form, setForm] = useState({ bank_name: "", bank_account_no: "", account_holder: "", payment_instructions: "", qr_image_url: "" });
  useEffect(() => { if (data) setForm({ bank_name: data.bank_name, bank_account_no: data.bank_account_no, account_holder: data.account_holder, payment_instructions: data.payment_instructions, qr_image_url: data.qr_image_url ?? "" }); }, [data]);

  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({ ...form, updated_at: new Date().toISOString() }).eq("id", "global");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["app-settings"] });
    qc.invalidateQueries({ queryKey: ["app-settings-admin"] });
  }

  async function uploadQR(file: File) {
    const ext = file.name.split(".").pop() || "png";
    const path = `qr-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("qr-images").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) return toast.error(up.error.message);
    const { data: pub } = supabase.storage.from("qr-images").getPublicUrl(up.data.path);
    setForm((f) => ({ ...f, qr_image_url: pub.publicUrl }));
    toast.success("QR uploaded — click Save to apply");
  }

  const [pw, setPw] = useState("");
  async function changePassword() {
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    setPw(""); toast.success("Password updated");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl md:text-4xl font-semibold text-primary">Settings</h1>
        <p className="text-sm text-[var(--slate-text)] mt-2">Bank account, QR image, payment instructions, and admin password.</p>
      </header>

      <section className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-semibold">Payment Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Account Holder</Label><Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} className="h-10 mt-1" /></div>
          <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="h-10 mt-1" /></div>
          <div className="md:col-span-2"><Label>Account Number</Label><Input value={form.bank_account_no} onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })} className="h-10 mt-1" /></div>
          <div className="md:col-span-2"><Label>Payment Instructions</Label><textarea value={form.payment_instructions} onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--input)] bg-background text-sm" /></div>
        </div>
        <div>
          <Label>QR Image</Label>
          {form.qr_image_url && <img src={form.qr_image_url} alt="QR" className="h-32 w-32 object-contain border border-[var(--border)] rounded mt-1" />}
          <input type="file" accept="image/*" className="block text-sm mt-2" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQR(f); }} />
        </div>
        <Button onClick={save} disabled={saving} className="rounded-xl bg-primary hover:bg-[var(--primary-hover)] h-11">{saving ? "Saving…" : "Save Settings"}</Button>
      </section>

      <section className="bg-card border border-[var(--border)] rounded-xl p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-semibold">Change Admin Password</h2>
        <div className="flex gap-3 items-end max-w-md">
          <div className="flex-1"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-10 mt-1" /></div>
          <Button onClick={changePassword} variant="outline" className="h-10">Update</Button>
        </div>
        <p className="text-xs text-[var(--slate-text)]">Signed in as user {userId?.slice(0, 8)}…</p>
      </section>
    </div>
  );
}