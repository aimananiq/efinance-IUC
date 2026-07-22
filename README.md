# E-Pay IUC System

A student finance management portal for IUC, built with TanStack Start, React 19, Tailwind CSS v4, and Lovable Cloud (Supabase).

## Features

### Admin Portal
- **Dashboard** — overview of students, fees, payments, and PTPTN status
- **Student Management** — add, edit, and bulk-import students via CSV
- **Fee Structure** — define fee items and amounts per programme/semester
- **Fees** — assign and adjust fees per student
- **Payments** — record and review student payments
- **Receipts** — generate and manage payment receipts
- **PTPTN Management** — upload PTPTN records (Excel), view/edit per-student PTPTN, auto-recalculate outstanding balances
- **History & Notifications** — full audit trail and announcements
- **Settings** — system configuration

### Student Portal
- **Dashboard** — fee summary, outstanding balance (after PTPTN), PTPTN info card
- **Ledger** — itemised fee breakdown with post-PTPTN balances
- **Payment** — make payments online
- **Receipts & History** — download receipts and review payment history
- **Profile** — manage personal details

### Other
- Role-based access control (admin / student) via secure `has_role` function
- Row-Level Security on every table
- Mobile-friendly responsive layout (hamburger nav, horizontal-scroll tables)
- Real-time recalculation of outstanding fees whenever PTPTN, fees, or payments change

## Tech Stack

- **Framework:** TanStack Start v1 (React 19, SSR-capable, file-based routing)
- **Build:** Vite 7
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Backend:** Lovable Cloud (Supabase) — Postgres, Auth, Storage, Edge Functions
- **Data:** TanStack Query + TanStack Router loaders
- **Server logic:** `createServerFn` (TanStack server functions)
- **Runtime:** Cloudflare Workers (edge)

## Project Structure

```
src/
  routes/            # File-based routes (admin.*, student.*, login.*)
  components/        # Reusable UI + shadcn primitives
  hooks/             # Custom React hooks (auth, PTPTN, mobile)
  lib/               # Server functions (*.functions.ts) + utilities
  integrations/
    supabase/        # Auto-generated Supabase client + auth middleware
supabase/migrations/ # Database schema migrations
```

## Development

This project is developed on [Lovable](https://lovable.dev). Changes pushed to this repo automatically sync back to the Lovable editor and vice versa.

### Local setup

```bash
bun install
bun run dev
```

The app starts on `http://localhost:5173`.

### Environment

Lovable Cloud auto-provisions the required `VITE_SUPABASE_*` variables. For local development outside Lovable, copy them from your Cloud project settings into a local `.env` file.

## Deployment

Published via Lovable (Cloudflare Workers). To self-host, build with `bun run build` and deploy the output to any Workers-compatible host.

## License

Proprietary — IUC internal use.