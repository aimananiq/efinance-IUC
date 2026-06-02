CREATE POLICY "student reads own ptptn" ON public.ptptn_records FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.user_id = auth.uid() AND lower(sp.student_id) = lower(ptptn_records.student_id)
  )
);