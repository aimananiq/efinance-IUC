import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useIucAuth } from "@/hooks/use-iuc-auth";
import { supabase } from "@/integrations/supabase/client";
import { IucLogo } from "@/components/iuc/Logo";
import { OutsidePaymentLogin } from "@/components/iuc/OutsidePaymentLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { outsidePaymentSchema, validatePaymentProof } from "@/lib/outside-payment";
import { Upload, LogOut, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Outside Payments — E-Pay IUC" }, { name: "description", content: "Sign in and submit a non-student payment to Innovative University College." }, { property: "og:title", content: "Outside Payments — E-Pay IUC" }, { property: "og:description", content: "Submit your payment details and proof for finance review." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OutsidePaymentPage,
});

function OutsidePaymentPage() {
  const { session, userId, loading } = useIucAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [contact, setContact] = useState("");
  const [purpose, setPurpose] = useState(""); const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "ONLINE_BANKING" | "QR_PAYMENT" | "CASH_DEPOSIT" | "OTHER">("BANK_TRANSFER");
  const [remarks, setRemarks] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reference, setReference] = useState("");
  const settings = useQuery({ queryKey: ["app-settings"], enabled: Boolean(session), queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("bank_name,bank_account_no,account_holder,qr_image_url").eq("id", "global").single();
    if (error) throw error; return data;
  }});
  const history = useQuery({ queryKey: ["outside-payments-own", userId], enabled: Boolean(userId), queryFn: async () => {
    if (!userId) return [];
    const { data, error } = await supabase.from("outside_payments").select("payment_reference,purpose,amount,status,admin_remarks,created_at").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error; return data;
  }});
  async function signOut() {
    await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut();
    setReference(""); setName(""); setContact(""); setPurpose(""); setAmount(""); setRemarks(""); setFile(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    let uploadedPath: string | null = null;
    try {
      if (!userId) throw new Error("Please sign in");
      const values = outsidePaymentSchema.parse({ payer_name: name, contact, purpose, amount, payment_method: method, remarks });
      if (!file) throw new Error("Please upload payment proof");
      validatePaymentProof(file); setBusy(true);
      const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/outside-${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
      if (upload.error) throw upload.error; uploadedPath = path;
      const { data, error } = await supabase.rpc("submit_outside_payment", { p_name: values.payer_name, p_contact: values.contact, p_purpose: values.purpose, p_amount: values.amount, p_method: values.payment_method, p_proof: path, p_remarks: values.remarks || undefined });
      if (error) throw error;
      uploadedPath = null; setReference(data); setAmount(""); setPurpose(""); setRemarks(""); setFile(null);
      await qc.invalidateQueries({ queryKey: ["outside-payments-own"] });
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("receipts").remove([uploadedPath]);
      setError(error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your details" : error instanceof Error ? error.message : "Unable to submit payment");
    } finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-surface-blue">
    <header className="border-b bg-card"><div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-3">
      <Link to="/" aria-label="E-Pay IUC home"><IucLogo className="h-12" /></Link>
      {session ? <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button> : <Button asChild variant="ghost"><Link to="/"><ArrowLeft className="h-4 w-4" />Back</Link></Button>}
    </div></header>
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-7">
      <h1 className="text-3xl font-semibold text-primary">Make a Payment</h1>
      {loading ? <p>Loading…</p> : !session ? <OutsidePaymentLogin onSignedIn={() => qc.invalidateQueries()} /> : <>
        {reference && <div role="status" className="flex gap-3 border-l-4 border-primary bg-accent p-4"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Payment submitted for verification</p><p className="break-all text-sm">Reference: {reference}</p></div></div>}
        {settings.isError && <p role="alert" className="text-destructive">Bank details could not be loaded. Please refresh before transferring money.</p>}
        {settings.data && <section className="border-b pb-6 space-y-2 text-sm"><h2 className="text-lg font-semibold">Bank details</h2><p>{settings.data.account_holder} · {settings.data.bank_name}</p><p className="font-mono">{settings.data.bank_account_no}</p><p>Payment reference: your name and payment purpose.</p></section>}
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div><Label htmlFor="payer-name">Full name</Label><Input id="payer-name" value={name} onChange={e => setName(e.target.value)} required maxLength={150} className="mt-2 h-11" /></div>
            <div><Label htmlFor="payer-contact">Contact email or phone</Label><Input id="payer-contact" value={contact} onChange={e => setContact(e.target.value)} required maxLength={255} className="mt-2 h-11" /></div>
          </div>
          <div><Label htmlFor="purpose">Payment purpose</Label><Input id="purpose" value={purpose} onChange={e => setPurpose(e.target.value)} required maxLength={500} className="mt-2 h-11" /></div>
          <div className="grid sm:grid-cols-2 gap-5"><div><Label htmlFor="outside-amount">Amount paid (RM)</Label><Input id="outside-amount" type="number" step="0.01" min="0.01" max="9999999999.99" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-2 h-11" /></div>
            <div><Label htmlFor="outside-method">Payment method</Label><select id="outside-method" value={method} onChange={e => setMethod(outsidePaymentSchema.shape.payment_method.parse(e.target.value))} className="mt-2 w-full h-11 rounded-md border border-input bg-background px-3 text-sm">{outsidePaymentSchema.shape.payment_method.options.map(m => <option key={m} value={m}>{m.replaceAll("_", " ")}</option>)}</select></div></div>
          {method === "QR_PAYMENT" && <section className="border-y py-5"><h2 className="font-semibold mb-3">Payment QR</h2>{settings.data?.qr_image_url ? <img src={settings.data.qr_image_url} alt="Admin-configured payment QR code" className="h-64 w-64 max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">No payment QR is available. Please use bank transfer or contact finance.</p>}</section>}
          <div><Label htmlFor="outside-remarks">Remarks (optional)</Label><Input id="outside-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} maxLength={1000} className="mt-2 h-11" /></div>
          <div><Label htmlFor="outside-proof">Payment proof (PDF, JPG, PNG · max 5MB)</Label><div className="mt-2 flex gap-3 items-center"><Upload className="h-5 w-5 shrink-0 text-muted-foreground" /><Input key={reference} id="outside-proof" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="min-w-0" /></div></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="h-12 px-8">{busy ? "Submitting…" : "Submit Payment"}</Button>
        </form>
        <section className="border-t pt-6"><h2 className="text-xl font-semibold mb-4">Your submissions</h2>{history.isError ? <p role="alert">Unable to load submissions.</p> : history.isLoading ? <p>Loading…</p> : history.data?.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-3">Reference / Purpose</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead><tbody>{history.data?.map(p => <tr key={p.payment_reference} className="border-t"><td className="p-3"><p className="font-mono text-xs">{p.payment_reference}</p><p>{p.purpose}</p></td><td className="p-3 whitespace-nowrap">RM {Number(p.amount).toFixed(2)}</td><td className="p-3">{p.status}{p.admin_remarks && <p className="text-xs text-muted-foreground">{p.admin_remarks}</p>}</td></tr>)}</tbody></table></div>}</section>
      </>}
    </main>
  </div>;
}