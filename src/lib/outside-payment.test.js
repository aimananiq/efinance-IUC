import { describe, test, expect } from "bun:test";
import { outsidePaymentSchema, validatePaymentProof } from "./outside-payment";

const payment = { payer_name: "Outside payer", contact: "payer@example.test", purpose: "Event registration", amount: 125, payment_method: "BANK_TRANSFER", remarks: "" };
describe("outside payment rules", () => {
  test("saves name and payment details without student or profile fields", () => {
    expect(outsidePaymentSchema.parse(payment)).toEqual(payment);
    expect(outsidePaymentSchema.safeParse({ ...payment, payer_name: "" }).success).toBe(false);
  });
  test("accepts other purposes without a Student ID", () => {
    expect(outsidePaymentSchema.parse(payment).purpose).toBe("Event registration");
  });
  test("requires positive finite amount", () => {
    expect(outsidePaymentSchema.safeParse({ ...payment, amount: 0 }).success).toBe(false);
    expect(outsidePaymentSchema.safeParse({ ...payment, amount: Infinity }).success).toBe(false);
  });
  test("caps proof at 5MB and accepts PDF JPG PNG", () => {
    expect(() => validatePaymentProof({ size: 5242880, type: "application/pdf" })).not.toThrow();
    expect(() => validatePaymentProof({ size: 5242881, type: "image/png" })).toThrow();
    expect(() => validatePaymentProof({ size: 100, type: "text/html" })).toThrow();
  });
});