import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudentPtptn = {
  id: string;
  student_id: string;
  student_name: string;
  programme: string;
  total_fee: number;
  ptptn_amount: number;
};

export function useStudentPtptn(studentIdText: string | null | undefined) {
  return useQuery<StudentPtptn | null>({
    queryKey: ["student-ptptn", studentIdText],
    enabled: !!studentIdText,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ptptn_records")
        .select("id,student_id,student_name,programme,total_fee,ptptn_amount")
        .ilike("student_id", studentIdText!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        total_fee: Number(data.total_fee) || 0,
        ptptn_amount: Number(data.ptptn_amount) || 0,
      } as StudentPtptn;
    },
  });
}

export function formatRM(n: number) {
  return `RM ${Number(n || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}