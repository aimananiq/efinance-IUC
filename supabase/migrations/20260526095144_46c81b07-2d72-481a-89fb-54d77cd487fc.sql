ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS fee_code text;
CREATE INDEX IF NOT EXISTS idx_student_profiles_fee_code ON public.student_profiles (fee_code);