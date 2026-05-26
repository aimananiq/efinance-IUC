export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          account_holder: string
          bank_account_no: string
          bank_name: string
          id: string
          payment_instructions: string
          qr_image_url: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string
          bank_account_no?: string
          bank_name?: string
          id?: string
          payment_instructions?: string
          qr_image_url?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank_account_no?: string
          bank_name?: string
          id?: string
          payment_instructions?: string
          qr_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fee_items: {
        Row: {
          amount: number
          balance: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          paid_amount: number
          sort_order: number
          status: Database["public"]["Enums"]["fee_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          balance?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          paid_amount?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["fee_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          paid_amount?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["fee_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structure_items: {
        Row: {
          amount_international: number
          amount_local: number
          created_at: string
          discount_international: number
          discount_local: number
          id: string
          name: string
          sort_order: number
          structure_id: string
        }
        Insert: {
          amount_international?: number
          amount_local?: number
          created_at?: string
          discount_international?: number
          discount_local?: number
          id?: string
          name: string
          sort_order?: number
          structure_id: string
        }
        Update: {
          amount_international?: number
          amount_local?: number
          created_at?: string
          discount_international?: number
          discount_local?: number
          id?: string
          name?: string
          sort_order?: number
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structure_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          programme: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          programme: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          programme?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          admin_remarks: string | null
          amount: number
          created_at: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string
          receipt_file_url: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["payment_verification_status"]
          student_id: string
          submitted_nric: string
          updated_at: string
          verified_at: string | null
          verified_by_id: string | null
        }
        Insert: {
          admin_remarks?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string
          receipt_file_url?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["payment_verification_status"]
          student_id: string
          submitted_nric: string
          updated_at?: string
          verified_at?: string | null
          verified_by_id?: string | null
        }
        Update: {
          admin_remarks?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string
          receipt_file_url?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["payment_verification_status"]
          student_id?: string
          submitted_nric?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          id: string
          official_receipt_url: string | null
          payment_id: string
          receipt_number: string
          student_id: string
          updated_at: string
          uploaded_by_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          official_receipt_url?: string | null
          payment_id: string
          receipt_number: string
          student_id: string
          updated_at?: string
          uploaded_by_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          official_receipt_url?: string | null
          payment_id?: string
          receipt_number?: string
          student_id?: string
          updated_at?: string
          uploaded_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          fee_code: string | null
          full_name: string
          id: string
          intake: string | null
          nric: string
          outstanding_balance: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          programme: string
          semester: string
          status: Database["public"]["Enums"]["user_status"]
          student_id: string
          total_fee: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fee_code?: string | null
          full_name: string
          id?: string
          intake?: string | null
          nric: string
          outstanding_balance?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          programme: string
          semester: string
          status?: Database["public"]["Enums"]["user_status"]
          student_id: string
          total_fee?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fee_code?: string | null
          full_name?: string
          id?: string
          intake?: string | null
          nric?: string
          outstanding_balance?: number
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          programme?: string
          semester?: string
          status?: Database["public"]["Enums"]["user_status"]
          student_id?: string
          total_fee?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_payment: {
        Args: { p_admin_remarks?: string; p_payment_id: string }
        Returns: Json
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      generate_payment_reference: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_student_totals: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      reject_payment: {
        Args: { p_admin_remarks: string; p_payment_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "STUDENT" | "ADMIN"
      fee_status: "UNPAID" | "PARTIAL_PAID" | "PAID"
      notification_type: "PAYMENT" | "FEE" | "RECEIPT" | "SYSTEM"
      payment_method:
        | "BANK_TRANSFER"
        | "QR_PAYMENT"
        | "CASH_DEPOSIT"
        | "OTHER"
        | "ONLINE_BANKING"
      payment_status:
        | "UNPAID"
        | "PARTIAL_PAID"
        | "PENDING_VERIFICATION"
        | "FULLY_PAID"
      payment_verification_status: "PENDING" | "APPROVED" | "REJECTED"
      user_status: "ACTIVE" | "INACTIVE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["STUDENT", "ADMIN"],
      fee_status: ["UNPAID", "PARTIAL_PAID", "PAID"],
      notification_type: ["PAYMENT", "FEE", "RECEIPT", "SYSTEM"],
      payment_method: [
        "BANK_TRANSFER",
        "QR_PAYMENT",
        "CASH_DEPOSIT",
        "OTHER",
        "ONLINE_BANKING",
      ],
      payment_status: [
        "UNPAID",
        "PARTIAL_PAID",
        "PENDING_VERIFICATION",
        "FULLY_PAID",
      ],
      payment_verification_status: ["PENDING", "APPROVED", "REJECTED"],
      user_status: ["ACTIVE", "INACTIVE"],
    },
  },
} as const
