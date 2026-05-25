/**
 * Helpers to map IUC login credentials to Supabase Auth synthetic emails.
 * Students log in with Student ID + NRIC; admins with username + password.
 * Internally we use synthetic emails so we can leverage Supabase Auth.
 */
export const STUDENT_EMAIL_DOMAIN = "iuc.student.local";
export const ADMIN_EMAIL_DOMAIN = "iuc.admin.local";

export function studentEmail(studentId: string) {
  return `${studentId.trim().toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}
export function adminEmail(username: string) {
  return `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
}