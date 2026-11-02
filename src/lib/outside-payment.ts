import { z } from "zod";

export const outsidePaymentSchema = z.object({
  payer_name: z.string().trim().min(1, "Enter your full name").max(150),
  contact: z.string().trim().min(1, "Enter a contact email or phone number").max(255),
  purpose: z.string().trim().min(1, "Enter the payment purpose").max(500),
  amount: z.coerce.number().finite().positive("Enter a valid amount").max(9999999999.99),
  payment_method: z.enum(["BANK_TRANSFER", "ONLINE_BANKING", "QR_PAYMENT", "CASH_DEPOSIT", "OTHER"]),
  remarks: z.string().trim().max(1000),
});

export function validatePaymentProof(file: { size: number; type: string }) {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error("Payment proof must be between 1 byte and 5MB");
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) throw new Error("Upload a PDF, JPG, or PNG file");
}