CREATE OR REPLACE FUNCTION public.submit_outside_payment(p_name text, p_contact text, p_purpose text, p_amount numeric, p_method public.payment_method, p_proof text, p_remarks text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 9999999999.99 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 IF split_part(p_proof, '/', 1) <> auth.uid()::text OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts' AND name = p_proof AND metadata->>'mimetype' IN ('image/jpeg','image/png','application/pdf') AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880) THEN RAISE EXCEPTION 'Upload a PDF, JPG or PNG proof of 5MB or smaller'; END IF;
 INSERT INTO public.outside_payments(user_id, payer_name, contact, purpose, amount, payment_method, receipt_file_url, remarks)
 VALUES(auth.uid(), trim(p_name), trim(p_contact), trim(p_purpose), p_amount, p_method, p_proof, p_remarks) RETURNING payment_reference INTO ref;
 RETURN ref;
END $$;
ALTER TABLE public.outside_payments ADD CONSTRAINT outside_payment_rejection_reason CHECK (status <> 'REJECTED' OR length(trim(admin_remarks)) > 0 AND admin_remarks IS NOT NULL);
