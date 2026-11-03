import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IucLogo } from "@/components/iuc/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { outsidePaymentSchema, validatePaymentProof } from "@/lib/outside-payment";
import { Upload, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Make a Payment — E-Pay IUC" }, { name: "description", content: "Submit a non-student payment to Innovative University College — no sign-in needed." }, { property: "og:title", content: "Make a Payment — E-Pay IUC" }, { property: "og:description", content: "Submit your payment details and proof for finance review." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OutsidePaymentPage,
});

function OutsidePaymentPage() {
  const [name, setName] = useState(""); const [contact, setContact] = useState("");
  const [purpose, setPurpose] = useState(""); const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "ONLINE_BANKING" | "QR_PAYMENT" | "CASH_DEPOSIT" | "OTHER">("BANK_TRANSFER");
  const [remarks, setRemarks] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reference, setReference] = useState("");
  const settings = useQuery({ queryKey: ["app-settings"], queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("bank_name,bank_account_no,account_holder,qr_image_url").eq("id", "global").single();
    if (error) throw error; return data;
  }});
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    let uploadedPath: string | null = null;
    try {
      const values = outsidePaymentSchema.parse({ payer_name: name, contact, purpose, amount, payment_method: method, remarks });
      if (!file) throw new Error("Please upload payment proof");
      validatePaymentProof(file); setBusy(true);
      const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
      const path = `anonymous/outside-${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
      if (upload.error) throw upload.error; uploadedPath = path;
      const { data, error } = await supabase.rpc("submit_outside_payment", { p_name: values.payer_name, p_contact: values.contact, p_purpose: values.purpose, p_amount: values.amount, p_method: values.payment_method, p_proof: path, p_remarks: values.remarks || undefined });
      if (error) throw error;
      uploadedPath = null; setReference(data); setName(""); setContact(""); setAmount(""); setPurpose(""); setRemarks(""); setFile(null);
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("receipts").remove([uploadedPath]);
      setError(error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your details" : error instanceof Error ? error.message : "Unable to submit payment");
    } finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-surface-blue">
    <header className="border-b bg-card"><div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-3">
      <Link to="/" aria-label="E-Pay IUC home"><IucLogo className="h-12" /></Link>
      <Button asChild variant="ghost"><Link to="/"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
    </div></header>
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-7">
      <div>
        <h1 className="text-3xl font-semibold text-primary">Make a Payment</h1>
        <p className="text-sm text-muted-foreground mt-2">No account needed — fill in your details, upload your payment proof, and submit.</p>
      </div>
      {reference && <div role="status" className="flex gap-3 border-l-4 border-primary bg-accent p-4"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-semibold">Payment submitted for verification</p><p className="break-all text-sm">Reference: {reference}</p><p className="text-sm text-muted-foreground">Keep this reference — our finance team will review your payment.</p></div></div>}
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
    </main>
  </div>;
}
