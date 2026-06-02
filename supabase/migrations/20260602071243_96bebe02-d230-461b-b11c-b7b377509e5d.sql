
CREATE TABLE public.ptptn_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL UNIQUE,
  student_name text NOT NULL,
  programme text NOT NULL DEFAULT '',
  total_fee numeric(12,2) NOT NULL DEFAULT 0,
  ptptn_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ptptn_records TO authenticated;
GRANT ALL ON public.ptptn_records TO service_role;

ALTER TABLE public.ptptn_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads ptptn"   ON public.ptptn_records FOR SELECT TO authenticated USING (public.current_user_is_admin());
CREATE POLICY "admin inserts ptptn" ON public.ptptn_records FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin());
CREATE POLICY "admin updates ptptn" ON public.ptptn_records FOR UPDATE TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "admin deletes ptptn" ON public.ptptn_records FOR DELETE TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.ptptn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER ptptn_records_updated_at BEFORE UPDATE ON public.ptptn_records
  FOR EACH ROW EXECUTE FUNCTION public.ptptn_set_updated_at();

CREATE INDEX idx_ptptn_records_student_id ON public.ptptn_records(lower(student_id));
