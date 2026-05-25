# IUC E-Finance Information System — Build Plan

## Stack mapping (your spec → what runs here)
- Next.js App Router → **TanStack Start file routes** (`src/routes/`)
- Prisma + MySQL → **Lovable Cloud (Supabase / Postgres)** with RLS
- NextAuth Credentials → **Supabase Auth** with synthetic emails (`{studentId}@iuc.local`, `admin@iuc.local`) so we can keep your "Student ID + NRIC" and "username + password" UX
- File uploads → **Supabase Storage** buckets (`receipts`, `official-receipts`, `qr-images`)
- Public deploy link → **Lovable Publish** → `*.lovable.app` (no ngrok/Vercel from here)

Everything else (models, statuses, business rules, navy design system, seed data) stays identical to your spec.

## Design system
Tailwind v4 tokens in `src/styles.css` updated to the exact navy palette, Satoshi font stack, 8pt spacing, 16px button radius / 12px card radius / 8px input radius, status badge colors, card shadows. All pages use shared primitives (`Button`, `Card`, `Input`, `Badge`, `Table`, `Modal`, `Sidebar`, `TopNav`, `PageHeader`, `StatCard`, `EmptyState`, `SearchFilterBar`, `FileUpload`). IUC logo wired into login + sidebar.

## Phases

### Phase 1 — Foundation (this turn)
1. Enable Lovable Cloud
2. Migrate schema: `student_profiles`, `admin_profiles`, `fee_items`, `payments`, `receipts`, `notifications`, `audit_logs` + enums + RLS + sequences for `PAY-YYYY-####` / `REC-YYYY-####` (unique, race-safe via Postgres function)
3. Storage buckets + policies
4. Design system tokens + shared UI primitives + IUC logo asset
5. Auth: `/login/student` (Student ID + NRIC), `/login/admin` (username + password), middleware-style route guards (`_student`, `_admin` layouts) with role check
6. Seed: 1 admin (`admin` / `admin123`), 5 students with fee breakdowns, sample payments + receipts + notifications + audit entries

### Phase 2 — Student portal
Dashboard, Make Payment (with receipt upload + validation), Ledger, Payment History, Receipt, Profile

### Phase 3 — Admin portal
Dashboard, Students list + add + bulk CSV import + detail, Fee Management (drag-and-drop reorder), Payment Verification (safe approve/reject with idempotent receipt upsert + ledger recalc in a single server fn / RPC), Receipts, Notifications, Audit History, Settings (bank details + QR image)

### Phase 4 — Polish
Toasts, confirmation dialogs, empty/loading states, pagination, responsive sweep at 320 / 480 / 768 / 1280, sitemap.xml + robots.txt, publish.

## Key technical notes
- **Approve payment** runs inside a Postgres RPC (`approve_payment(payment_id)`) so receipt-number generation, ledger update, balance recompute, notification insert, and audit log all happen atomically. Idempotent: if payment already `APPROVED`, returns existing receipt instead of inserting a duplicate. Receipt number generated from a Postgres sequence per year — guaranteed unique.
- **Role enforcement**: RLS policies use a `has_role(uid, 'admin')` SECURITY DEFINER function (per project rules — roles in a separate `user_roles` table, never on profile).
- **Receipt upload**: signed URLs from `receipts` bucket; admin-only bucket policies for `official-receipts`.
- **Synthetic emails** are an internal detail — students/admins never see them; the login forms accept Student ID / username and we map to the email under the hood.

## Deliverables at end of each phase
Working preview, summary of files changed, demo credentials, and (after Phase 4) a published `*.lovable.app` link.

---

**Start with Phase 1 now?** It's the largest single chunk because it unblocks everything else (schema + auth + design system + seed). Phases 2–4 follow in subsequent turns.
