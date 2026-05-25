
-- 1. Add ONLINE_BANKING to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'ONLINE_BANKING';

-- 2. App settings table (singleton row keyed by id='global')
CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'global',
  bank_name text NOT NULL DEFAULT 'Maybank',
  bank_account_no text NOT NULL DEFAULT '5142 0091 2233',
  account_holder text NOT NULL DEFAULT 'International University College',
  qr_image_url text,
  payment_instructions text NOT NULL DEFAULT 'Transfer the exact outstanding amount. Use your Student ID as the payment reference. Upload the bank receipt as proof.',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone authenticated reads settings" ON public.app_settings;
CREATE POLICY "anyone authenticated reads settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin updates settings" ON public.app_settings;
CREATE POLICY "admin updates settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin inserts settings" ON public.app_settings;
CREATE POLICY "admin inserts settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());
