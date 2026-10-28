-- SHL initial schema for Supabase/PostgreSQL.
-- Apply only to a new project or after reviewing against your existing schema.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum ('super_admin','admin','fleet_manager','booking_manager','support_agent','customer');
create type public.car_status as enum ('available','hidden','maintenance','archived');
create type public.booking_status as enum ('pending','confirmed','active','completed','cancelled','rejected');
create type public.payment_status as enum ('pending','paid','failed','refunded');
create type public.payment_method as enum ('cash_on_pickup','manual_transfer','online');
create type public.currency_code as enum ('MRU','EUR','USD');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text unique,
  email text,
  avatar_url text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar','fr','en')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  primary key(user_id, role)
);

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  make text not null,
  model text not null,
  model_year int check (model_year between 1980 and 2100),
  category text not null,
  city text not null,
  description text not null default '',
  seats int not null check (seats between 1 and 20),
  doors int not null default 4 check (doors between 2 and 6),
  transmission text not null check (transmission in ('automatic','manual')),
  fuel_type text not null check (fuel_type in ('petrol','diesel','hybrid','electric')),
  daily_rate numeric(12,2) not null check (daily_rate > 0),
  weekly_rate numeric(12,2) check (weekly_rate is null or weekly_rate > 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  currency public.currency_code not null default 'MRU',
  status public.car_status not null default 'hidden',
  fuel_policy text not null default 'same_to_same',
  mileage_limit_km int check (mileage_limit_km is null or mileage_limit_km >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(car_id, storage_path)
);

create table public.car_features (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  feature text not null,
  unique(car_id, feature)
);

create table public.car_locations (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  label text not null,
  address text,
  city text not null,
  is_pickup boolean not null default true,
  is_dropoff boolean not null default true
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default ('SHL-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,10))),
  customer_id uuid not null references auth.users(id),
  car_id uuid not null references public.cars(id),
  pickup_location_id uuid references public.car_locations(id),
  dropoff_location_id uuid references public.car_locations(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending',
  daily_rate_snapshot numeric(12,2) not null check (daily_rate_snapshot > 0),
  rental_subtotal numeric(12,2) not null check (rental_subtotal >= 0),
  fees numeric(12,2) not null default 0 check (fees >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  currency public.currency_code not null default 'MRU',
  driver_name text not null,
  driver_phone text not null,
  customer_note text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (discount <= rental_subtotal + fees)
);

-- Active reservations cannot overlap for the same vehicle, including concurrent requests.
-- Cancelled and rejected bookings release the interval.
alter table public.bookings add constraint bookings_no_overlapping_active
exclude using gist (
  car_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
)
where (status in ('pending','confirmed','active'));

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  old_status public.booking_status,
  new_status public.booking_status not null,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  provider text,
  provider_reference text unique,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null check (amount >= 0),
  currency public.currency_code not null default 'MRU',
  idempotency_key text unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  provider_reference text unique,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  customer_id uuid not null references auth.users(id),
  car_id uuid not null references public.cars(id),
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, car_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed','percent')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  min_booking_amount numeric(12,2) not null default 0 check (min_booking_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (discount_type <> 'percent' or discount_value <= 100)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id),
  user_id uuid not null references auth.users(id),
  booking_id uuid not null unique references public.bookings(id),
  redeemed_at timestamptz not null default now(),
  unique(coupon_id,user_id,booking_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app','email','sms')),
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','read')),
  provider_reference text,
  attempts int not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  booking_id uuid references public.bookings(id),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  description text not null,
  cost numeric(12,2) check (cost is null or cost >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create index cars_status_city_category_idx on public.cars(status, city, category);
create index cars_daily_rate_idx on public.cars(daily_rate);
create index bookings_customer_created_idx on public.bookings(customer_id, created_at desc);
create index bookings_car_dates_idx on public.bookings(car_id, starts_at, ends_at);
create index bookings_status_created_idx on public.bookings(status, created_at desc);
create index payments_booking_status_idx on public.payments(booking_id, status);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index support_tickets_status_created_idx on public.support_tickets(status, created_at desc);

-- Security-definer helper: role assignment is never client-writable.
create or replace function public.has_role(required_roles public.app_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = any(required_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.cars enable row level security;
alter table public.car_images enable row level security;
alter table public.car_features enable row level security;
alter table public.car_locations enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.platform_settings enable row level security;

-- Profiles: users can read/update only their own profile.
create policy "profile read own" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.has_role(array['super_admin','admin','support_agent']::public.app_role[]));
create policy "profile update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profile insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));

-- Public car catalog is read-only for visitors; all writes require server/admin authorization.
create policy "public read visible cars" on public.cars for select to anon, authenticated using (status = 'available' or public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));
create policy "staff manage cars" on public.cars for all to authenticated using (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));
create policy "public read car images" on public.car_images for select to anon, authenticated using (exists(select 1 from public.cars c where c.id = car_id and c.status = 'available'));
create policy "staff manage car images" on public.car_images for all to authenticated using (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));
create policy "public read car features" on public.car_features for select to anon, authenticated using (exists(select 1 from public.cars c where c.id = car_id and c.status = 'available'));
create policy "staff manage car features" on public.car_features for all to authenticated using (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));
create policy "public read pickup locations" on public.car_locations for select to anon, authenticated using (exists(select 1 from public.cars c where c.id = car_id and c.status = 'available'));
create policy "staff manage locations" on public.car_locations for all to authenticated using (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));

create policy "customer read own bookings" on public.bookings for select to authenticated using (customer_id = (select auth.uid()) or public.has_role(array['super_admin','admin','booking_manager','support_agent']::public.app_role[]));
create policy "customer create own booking" on public.bookings for insert to authenticated with check (customer_id = (select auth.uid()) and status = 'pending');
create policy "staff update bookings" on public.bookings for update to authenticated using (public.has_role(array['super_admin','admin','booking_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','booking_manager']::public.app_role[]));
create policy "read booking history" on public.booking_status_history for select to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and (b.customer_id = (select auth.uid()) or public.has_role(array['super_admin','admin','booking_manager','support_agent']::public.app_role[]))));
create policy "staff append booking history" on public.booking_status_history for insert to authenticated with check (public.has_role(array['super_admin','admin','booking_manager']::public.app_role[]));
create policy "customer read own payments" on public.payments for select to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and (b.customer_id = (select auth.uid()) or public.has_role(array['super_admin','admin','booking_manager']::public.app_role[]))));
create policy "staff manage payments" on public.payments for all to authenticated using (public.has_role(array['super_admin','admin','booking_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','booking_manager']::public.app_role[]));
create policy "staff manage refunds" on public.refunds for all to authenticated using (public.has_role(array['super_admin','admin']::public.app_role[])) with check (public.has_role(array['super_admin','admin']::public.app_role[]));

create policy "read reviews" on public.reviews for select to anon, authenticated using (true);
create policy "customer create eligible review" on public.reviews for insert to authenticated with check (customer_id = (select auth.uid()) and exists(select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()) and b.car_id = car_id and b.status = 'completed'));
create policy "customer manage favorites" on public.favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "read active coupons only" on public.coupons for select to authenticated using (active = true and starts_at <= now() and ends_at > now());
create policy "customer read own redemptions" on public.coupon_redemptions for select to authenticated using (user_id = (select auth.uid()));
create policy "customer read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "customer update own notifications" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "customer read own tickets" on public.support_tickets for select to authenticated using (customer_id = (select auth.uid()) or public.has_role(array['super_admin','admin','support_agent']::public.app_role[]));
create policy "customer create ticket" on public.support_tickets for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "staff update tickets" on public.support_tickets for update to authenticated using (public.has_role(array['super_admin','admin','support_agent']::public.app_role[])) with check (public.has_role(array['super_admin','admin','support_agent']::public.app_role[]));
create policy "staff read audit logs" on public.admin_audit_logs for select to authenticated using (public.has_role(array['super_admin','admin']::public.app_role[]));
create policy "staff append audit logs" on public.admin_audit_logs for insert to authenticated with check (public.has_role(array['super_admin','admin']::public.app_role[]));
create policy "fleet manage maintenance" on public.maintenance_records for all to authenticated using (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[])) with check (public.has_role(array['super_admin','admin','fleet_manager']::public.app_role[]));
create policy "public read public settings" on public.platform_settings for select to anon, authenticated using (key in ('brand','locales','public_contact','currency'));
create policy "admin manage settings" on public.platform_settings for all to authenticated using (public.has_role(array['super_admin','admin']::public.app_role[])) with check (public.has_role(array['super_admin','admin']::public.app_role[]));

-- Intentionally no public/client insert policy for user_roles.
-- Bootstrap the first Super Admin only through a trusted server-side one-time procedure.
-- Do not insert or expose the supplied initial admin secret in SQL or frontend files.
