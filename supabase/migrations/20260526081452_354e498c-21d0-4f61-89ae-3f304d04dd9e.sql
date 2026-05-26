
-- Fee structures
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  programme text not null,
  description text,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fee_structures_code on public.fee_structures(code);
create index if not exists idx_fee_structures_programme on public.fee_structures(programme);

create table if not exists public.fee_structure_items (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.fee_structures(id) on delete cascade,
  name text not null,
  amount_local numeric(12,2) not null default 0,
  amount_international numeric(12,2) not null default 0,
  discount_local numeric(12,2) not null default 0,
  discount_international numeric(12,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_fee_structure_items_structure on public.fee_structure_items(structure_id);

alter table public.fee_structures enable row level security;
alter table public.fee_structure_items enable row level security;

create policy "admin manages fee structures" on public.fee_structures
  for all to authenticated using (current_user_is_admin()) with check (current_user_is_admin());
create policy "authenticated reads fee structures" on public.fee_structures
  for select to authenticated using (true);

create policy "admin manages fee structure items" on public.fee_structure_items
  for all to authenticated using (current_user_is_admin()) with check (current_user_is_admin());
create policy "authenticated reads fee structure items" on public.fee_structure_items
  for select to authenticated using (true);

-- Soft delete support for students
alter table public.student_profiles
  add column if not exists deleted_at timestamptz;
