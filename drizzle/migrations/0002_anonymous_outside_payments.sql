ALTER TABLE public.outside_payments ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_outside_payment(p_name text, p_contact text, p_purpose text, p_amount numeric, p_method public.payment_method, p_proof text, p_remarks text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref text; uid uuid := auth.uid();
BEGIN
 IF uid IS NOT NULL THEN
   IF split_part(p_proof, '/', 1) <> uid::text THEN RAISE EXCEPTION 'Invalid payment proof'; END IF;
 ELSE
   IF split_part(p_proof, '/', 1) <> 'anonymous' THEN RAISE EXCEPTION 'Invalid payment proof'; END IF;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'receipts' AND name = p_proof) THEN RAISE EXCEPTION 'Invalid payment proof'; END IF;
 INSERT INTO public.outside_payments(user_id, payer_name, contact, purpose, amount, payment_method, receipt_file_url, remarks)
 VALUES(uid, trim(p_name), trim(p_contact), trim(p_purpose), p_amount, p_method, p_proof, p_remarks) RETURNING payment_reference INTO ref;
 RETURN ref;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_outside_payment(text,text,text,numeric,public.payment_method,text,text) TO anon;

CREATE POLICY "Anonymous proof upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'receipts' AND split_part(name, '/', 1) = 'anonymous');
CREATE POLICY "Anonymous proof cleanup" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'receipts' AND split_part(name, '/', 1) = 'anonymous');