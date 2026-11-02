CREATE TABLE public.outside_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 payment_reference text NOT NULL UNIQUE DEFAULT ('EXT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
 payer_name text NOT NULL CHECK (length(trim(payer_name)) BETWEEN 1 AND 150),
 contact text NOT NULL CHECK (length(trim(contact)) BETWEEN 1 AND 255),
 purpose text NOT NULL CHECK (length(trim(purpose)) BETWEEN 1 AND 500),
 amount numeric(12,2) NOT NULL CHECK (amount > 0 AND amount <= 9999999999.99),
 payment_method public.payment_method NOT NULL,
 receipt_file_url text NOT NULL,
 remarks text CHECK (length(remarks) <= 1000),
 status public.payment_verification_status NOT NULL DEFAULT 'PENDING',
 admin_remarks text CHECK (length(admin_remarks) <= 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outside_payments TO authenticated;
GRANT UPDATE (status, admin_remarks) ON public.outside_payments TO authenticated;
GRANT ALL ON public.outside_payments TO service_role;
ALTER TABLE public.outside_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payers read their submissions" ON public.outside_payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read outside payments" ON public.outside_payments FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "Admins review outside payments" ON public.outside_payments FOR UPDATE TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE INDEX outside_payments_created_at_idx ON public.outside_payments(created_at DESC);
CREATE FUNCTION public.submit_outside_payment(p_name text, p_contact text, p_purpose text, p_amount numeric, p_method public.payment_method, p_proof text, p_remarks text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF split_part(p_proof, '/', 1) <> auth.uid()::text OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts' AND name = p_proof) THEN RAISE EXCEPTION 'Invalid payment proof'; END IF;
 INSERT INTO public.outside_payments(user_id, payer_name, contact, purpose, amount, payment_method, receipt_file_url, remarks)
 VALUES(auth.uid(), trim(p_name), trim(p_contact), trim(p_purpose), p_amount, p_method, p_proof, p_remarks) RETURNING payment_reference INTO ref;
 RETURN ref;
END $$;
REVOKE ALL ON FUNCTION public.submit_outside_payment(text,text,text,numeric,public.payment_method,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_outside_payment(text,text,text,numeric,public.payment_method,text,text) TO authenticated;
