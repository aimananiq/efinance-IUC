
-- ============ ENUMS ============
create type public.app_role as enum ('STUDENT', 'ADMIN');
create type public.user_status as enum ('ACTIVE', 'INACTIVE');
create type public.payment_status as enum ('UNPAID', 'PARTIAL_PAID', 'PENDING_VERIFICATION', 'FULLY_PAID');
create type public.fee_status as enum ('UNPAID', 'PARTIAL_PAID', 'PAID');
create type public.payment_verification_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.payment_method as enum ('BANK_TRANSFER', 'QR_PAYMENT', 'CASH_DEPOSIT', 'OTHER');
create type public.notification_type as enum ('PAYMENT', 'FEE', 'RECEIPT', 'SYSTEM');

-- ============ USER ROLES (separate table per security rules) ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'ADMIN')
$$;

create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles for select using (public.current_user_is_admin());

-- ============ STUDENT PROFILES ============
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  student_id text not null unique,
  nric text not null,
  email text,
  phone text,
  programme text not null,
  semester text not null,
  intake text,
  status user_status not null default 'ACTIVE',
  total_fee numeric(12,2) not null default 0,
  total_paid numeric(12,2) not null default 0,
  outstanding_balance numeric(12,2) not null default 0,
  payment_status payment_status not null default 'UNPAID',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_profiles enable row level security;
create policy "student reads own profile" on public.student_profiles for select using (auth.uid() = user_id);
create policy "admin reads all student profiles" on public.student_profiles for select using (public.current_user_is_admin());
create policy "admin inserts student profiles" on public.student_profiles for insert with check (public.current_user_is_admin());
create policy "admin updates student profiles" on public.student_profiles for update using (public.current_user_is_admin());
create policy "admin deletes student profiles" on public.student_profiles for delete using (public.current_user_is_admin());

-- ============ ADMIN PROFILES ============
create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null default 'Administrator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
create policy "admin reads own admin profile" on public.admin_profiles for select using (auth.uid() = user_id or public.current_user_is_admin());
create policy "admin updates own admin profile" on public.admin_profiles for update using (auth.uid() = user_id);

-- ============ FEE ITEMS ============
create table public.fee_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  due_date date,
  status fee_status not null default 'UNPAID',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fee_items enable row level security;
create policy "student reads own fee items" on public.fee_items for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "admin manages fee items" on public.fee_items for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- ============ PAYMENTS ============
create sequence public.payment_ref_seq;
create sequence public.receipt_num_seq;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_reference text not null unique,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method payment_method not null,
  submitted_nric text not null,
  receipt_file_url text,
  status payment_verification_status not null default 'PENDING',
  remarks text,
  admin_remarks text,
  verified_by_id uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "student reads own payments" on public.payments for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "student inserts own payments" on public.payments for insert
  with check (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "admin reads all payments" on public.payments for select using (public.current_user_is_admin());
create policy "admin updates payments" on public.payments for update using (public.current_user_is_admin());

create or replace function public.generate_payment_reference()
returns text language plpgsql as $$
declare n int;
begin
  n := nextval('public.payment_ref_seq');
  return 'PAY-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
end$$;

-- ============ RECEIPTS ============
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  official_receipt_url text,
  uploaded_by_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.receipts enable row level security;
create policy "student reads own receipts" on public.receipts for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "admin manages receipts" on public.receipts for all
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create or replace function public.generate_receipt_number()
returns text language plpgsql as $$
declare n int;
begin
  n := nextval('public.receipt_num_seq');
  return 'REC-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
end$$;

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type notification_type not null default 'SYSTEM',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "user reads own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "user updates own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "admin reads all notifications" on public.notifications for select using (public.current_user_is_admin());
create policy "admin inserts notifications" on public.notifications for insert with check (public.current_user_is_admin());

-- ============ AUDIT LOGS ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "admin reads audit logs" on public.audit_logs for select using (public.current_user_is_admin());

-- ============ HELPER: recalc student totals ============
create or replace function public.recalc_student_totals(p_student_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_outstanding numeric(12,2);
  v_status payment_status;
  v_pending_count int;
begin
  select coalesce(sum(amount),0), coalesce(sum(paid_amount),0)
    into v_total, v_paid
  from public.fee_items where student_id = p_student_id;

  v_outstanding := greatest(v_total - v_paid, 0);

  select count(*) into v_pending_count
  from public.payments where student_id = p_student_id and status = 'PENDING';

  if v_outstanding <= 0 and v_total > 0 then
    v_status := 'FULLY_PAID';
  elsif v_pending_count > 0 then
    v_status := 'PENDING_VERIFICATION';
  elsif v_paid > 0 then
    v_status := 'PARTIAL_PAID';
  else
    v_status := 'UNPAID';
  end if;

  update public.student_profiles
    set total_fee = v_total,
        total_paid = v_paid,
        outstanding_balance = v_outstanding,
        payment_status = v_status,
        updated_at = now()
  where id = p_student_id;
end$$;

-- ============ APPROVE PAYMENT RPC (atomic, idempotent) ============
create or replace function public.approve_payment(p_payment_id uuid, p_admin_remarks text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments;
  v_receipt public.receipts;
  v_receipt_number text;
  v_fee record;
  v_remaining numeric(12,2);
  v_apply numeric(12,2);
begin
  if not public.has_role(auth.uid(), 'ADMIN') then
    raise exception 'Only admins can approve payments';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;

  -- Idempotent: already approved -> return existing receipt
  if v_payment.status = 'APPROVED' then
    select * into v_receipt from public.receipts where payment_id = p_payment_id;
    return jsonb_build_object('ok', true, 'already_approved', true, 'receipt_number', v_receipt.receipt_number);
  end if;

  if v_payment.status = 'REJECTED' then
    raise exception 'Cannot approve a rejected payment';
  end if;

  -- Update payment
  update public.payments
    set status = 'APPROVED',
        verified_by_id = auth.uid(),
        verified_at = now(),
        admin_remarks = coalesce(p_admin_remarks, admin_remarks),
        updated_at = now()
  where id = p_payment_id;

  -- Allocate payment amount across unpaid/partial fee items in sort_order
  v_remaining := v_payment.amount;
  for v_fee in
    select * from public.fee_items
    where student_id = v_payment.student_id and status <> 'PAID'
    order by sort_order, created_at
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_fee.amount - v_fee.paid_amount);
    if v_apply > 0 then
      update public.fee_items
        set paid_amount = paid_amount + v_apply,
            balance = greatest(amount - (paid_amount + v_apply), 0),
            status = case when (paid_amount + v_apply) >= amount then 'PAID'::fee_status
                          when (paid_amount + v_apply) > 0 then 'PARTIAL_PAID'::fee_status
                          else 'UNPAID'::fee_status end,
            updated_at = now()
      where id = v_fee.id;
      v_remaining := v_remaining - v_apply;
    end if;
  end loop;

  -- Recalc totals
  perform public.recalc_student_totals(v_payment.student_id);

  -- Upsert receipt (unique on payment_id prevents duplicates)
  select * into v_receipt from public.receipts where payment_id = p_payment_id;
  if not found then
    v_receipt_number := public.generate_receipt_number();
    insert into public.receipts (receipt_number, payment_id, student_id, uploaded_by_id)
    values (v_receipt_number, p_payment_id, v_payment.student_id, auth.uid())
    returning * into v_receipt;
  end if;

  -- Notify student
  insert into public.notifications (user_id, title, message, type)
  select sp.user_id,
         'Payment Approved',
         'Your payment ' || v_payment.payment_reference || ' has been approved. Receipt: ' || v_receipt.receipt_number,
         'PAYMENT'
  from public.student_profiles sp where sp.id = v_payment.student_id;

  -- Audit log
  insert into public.audit_logs (user_id, action, entity_type, entity_id, new_value)
  values (auth.uid(), 'APPROVE_PAYMENT', 'payment', p_payment_id::text,
          jsonb_build_object('receipt_number', v_receipt.receipt_number, 'amount', v_payment.amount));

  return jsonb_build_object('ok', true, 'already_approved', false, 'receipt_number', v_receipt.receipt_number);
end$$;

-- ============ REJECT PAYMENT RPC ============
create or replace function public.reject_payment(p_payment_id uuid, p_admin_remarks text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_payment public.payments;
begin
  if not public.has_role(auth.uid(), 'ADMIN') then
    raise exception 'Only admins can reject payments';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;
  if v_payment.status = 'APPROVED' then raise exception 'Cannot reject an approved payment'; end if;

  update public.payments
    set status = 'REJECTED', admin_remarks = p_admin_remarks, verified_by_id = auth.uid(),
        verified_at = now(), updated_at = now()
  where id = p_payment_id;

  perform public.recalc_student_totals(v_payment.student_id);

  insert into public.notifications (user_id, title, message, type)
  select sp.user_id, 'Payment Rejected',
         'Your payment ' || v_payment.payment_reference || ' was rejected: ' || p_admin_remarks,
         'PAYMENT'
  from public.student_profiles sp where sp.id = v_payment.student_id;

  insert into public.audit_logs (user_id, action, entity_type, entity_id, new_value)
  values (auth.uid(), 'REJECT_PAYMENT', 'payment', p_payment_id::text,
          jsonb_build_object('remarks', p_admin_remarks));

  return jsonb_build_object('ok', true);
end$$;

-- ============ STORAGE BUCKETS ============
insert into storage.buckets (id, name, public) values
  ('receipts', 'receipts', false),
  ('official-receipts', 'official-receipts', false),
  ('qr-images', 'qr-images', true)
on conflict (id) do nothing;

-- Receipts bucket: student uploads own, admin reads all
create policy "students upload own receipts" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "students read own receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.current_user_is_admin()));

-- Official receipts: admin manages, students can read theirs
create policy "admin manages official receipts" on storage.objects for all to authenticated
  using (bucket_id = 'official-receipts' and public.current_user_is_admin())
  with check (bucket_id = 'official-receipts' and public.current_user_is_admin());
create policy "students read own official receipts" on storage.objects for select to authenticated
  using (bucket_id = 'official-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- QR images: public read, admin write
create policy "public reads qr images" on storage.objects for select using (bucket_id = 'qr-images');
create policy "admin manages qr images" on storage.objects for all to authenticated
  using (bucket_id = 'qr-images' and public.current_user_is_admin())
  with check (bucket_id = 'qr-images' and public.current_user_is_admin());
