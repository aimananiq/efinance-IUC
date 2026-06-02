import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { useStudentPtptn, formatRM } from "@/hooks/use-student-ptptn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/student/payment")({
  head: () => ({ meta: [{ title: "Make Payment · IUC E-Finance" }] }),
  component: PaymentPage,
});

const METHODS = ["BANK_TRANSFER", "ONLINE_BANKING", "QR_PAYMENT", "CASH_DEPOSIT", "OTHER"] as const;

function PaymentPage() {
  const navigate = useNavigate();
  const { userId } = useIucAuth();
  const { data: profile } = useQuery({
    queryKey: ["sp-pay", userId], enabled: !!userId,
    queryFn: async () => (await supabase.from("student_profiles").select("*").eq("user_id", userId!).single()).data,
  });
  const { data: ptptn } = useStudentPtptn(profile?.student_id);
  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", "global").maybeSingle()).data,
  });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<typeof METHODS[number]>("BANK_TRANSFER");
  const [nric, setNric] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (nric.trim() !== profile.nric) { toast.error("NRIC does not match our records"); return; }
    if (!file) { toast.error("Please upload your payment proof / receipt"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be 5MB or smaller"); return; }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("receipts").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;

      const { data: ref } = await supabase.rpc("generate_payment_reference" as any);
      const reference = (ref as string) || `PAY-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`;

      const ins = await supabase.from("payments").insert({
        student_id: profile.id,
        payment_reference: reference,
        amount: amt,
        payment_method: method,
        submitted_nric: nric.trim(),
        receipt_file_url: up.data.path,
        remarks: remarks || null,
      } as any);
      if (ins.error) throw ins.error;
      toast.success(`Payment ${reference} submitted for verification`);
      navigate({ to: "/student/history" });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) return <p className="text-sm text-[var(--slate-text)]">Loading…</p>;
  const outstandingAfterPtptn = Math.max(Number(profile.outstanding_balance) - Number(ptptn?.ptptn_amount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-semibold text-primary">Make a Payment</h1>
        <p className="text-sm text-[var(--slate-text)] mt-1">Submit a payment with proof of transfer. Finance will verify and issue an official receipt.</p>
      </header>

      <div className="bg-[var(--surface-blue)] border-l-4 border-[var(--primary-accent)] rounded-lg p-5 flex gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--primary-accent)] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <p className="font-semibold">
            {ptptn ? "Outstanding balance (after PTPTN): " : "Outstanding balance: "}
            <span className="text-red-700">{formatRM(outstandingAfterPtptn)}</span>
          </p>
          <p className="text-[var(--slate-text)] mt-1">
            Transfer to {settings?.account_holder ?? "IUC"} · {settings?.bank_name ?? "Maybank"}{" "}
            <span className="font-mono">{settings?.bank_account_no ?? "5142 0091 2233"}</span> · Reference: your Student ID{" "}
            <span className="font-mono">{profile.student_id}</span>.
          </p>
          {settings?.payment_instructions && (
            <p className="text-[var(--slate-text)] mt-1">{settings.payment_instructions}</p>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="bg-card border border-[var(--border)] rounded-xl p-6 md:p-8 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="amount">Amount Paid (RM)</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="method">Payment Method</Label>
            <select id="method" value={method} onChange={(e) => setMethod(e.target.value as any)} className="mt-1.5 w-full h-11 px-3 rounded-md border border-[var(--input)] bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
              {METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="nric">Confirm NRIC</Label>
          <Input id="nric" value={nric} onChange={(e) => setNric(e.target.value)} required placeholder="Must match your registered NRIC" className="mt-1.5 h-11" />
        </div>
        <div>
          <Label htmlFor="remarks">Remarks (optional)</Label>
          <textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="mt-1.5 w-full px-3 py-2 rounded-md border border-[var(--input)] bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
        </div>
        <div>
          <Label htmlFor="file">Payment Proof / Bank Receipt</Label>
          <label htmlFor="file" className="mt-1.5 flex items-center justify-center gap-2 h-28 border-2 border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--primary-accent)] hover:bg-[var(--surface-blue)] transition">
            <Upload className="w-5 h-5 text-[var(--slate-text)]" />
            <span className="text-sm text-[var(--slate-text)]">
              {file ? <span className="text-primary font-medium">{file.name}</span> : "Click to upload (PDF, JPG, PNG · max 5MB)"}
            </span>
          </label>
          <input id="file" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="rounded-xl bg-primary hover:bg-[var(--primary-hover)] h-12 px-8">
            {submitting ? "Submitting…" : "Submit Payment"}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl h-12 px-6" onClick={() => navigate({ to: "/student/dashboard" })}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}