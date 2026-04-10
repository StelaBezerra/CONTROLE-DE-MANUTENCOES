create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  store_id uuid not null references public.stores(id) on delete restrict,
  store_name text not null,
  item_name text not null,
  item_type text,
  serial_number text,
  problem text not null,
  technician text,
  technician_phone text,
  budget_value numeric(12,2) not null default 0,
  invoice_value numeric(12,2) not null default 0,
  received_at_ti date,
  notes text,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_store_id on public.tickets(store_id);
create index if not exists idx_ticket_files_ticket_id on public.ticket_files(ticket_id);

alter table public.stores enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_files enable row level security;

drop policy if exists "stores_select_all" on public.stores;
drop policy if exists "stores_insert_all" on public.stores;
drop policy if exists "stores_update_all" on public.stores;
drop policy if exists "stores_delete_all" on public.stores;

create policy "stores_select_all" on public.stores
for select to anon using (true);

create policy "stores_insert_all" on public.stores
for insert to anon with check (true);

create policy "stores_update_all" on public.stores
for update to anon using (true) with check (true);

create policy "stores_delete_all" on public.stores
for delete to anon using (true);

drop policy if exists "tickets_select_all" on public.tickets;
drop policy if exists "tickets_insert_all" on public.tickets;
drop policy if exists "tickets_update_all" on public.tickets;
drop policy if exists "tickets_delete_all" on public.tickets;

create policy "tickets_select_all" on public.tickets
for select to anon using (true);

create policy "tickets_insert_all" on public.tickets
for insert to anon with check (true);

create policy "tickets_update_all" on public.tickets
for update to anon using (true) with check (true);

create policy "tickets_delete_all" on public.tickets
for delete to anon using (true);

drop policy if exists "ticket_files_select_all" on public.ticket_files;
drop policy if exists "ticket_files_insert_all" on public.ticket_files;
drop policy if exists "ticket_files_update_all" on public.ticket_files;
drop policy if exists "ticket_files_delete_all" on public.ticket_files;

create policy "ticket_files_select_all" on public.ticket_files
for select to anon using (true);

create policy "ticket_files_insert_all" on public.ticket_files
for insert to anon with check (true);

create policy "ticket_files_update_all" on public.ticket_files
for update to anon using (true) with check (true);

create policy "ticket_files_delete_all" on public.ticket_files
for delete to anon using (true);

insert into storage.buckets (id, name, public)
values ('maintenance-pdfs', 'maintenance-pdfs', true)
on conflict (id) do nothing;

drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_public_insert" on storage.objects;
drop policy if exists "storage_public_update" on storage.objects;
drop policy if exists "storage_public_delete" on storage.objects;

create policy "storage_public_read" on storage.objects
for select to anon
using (bucket_id = 'maintenance-pdfs');

create policy "storage_public_insert" on storage.objects
for insert to anon
with check (bucket_id = 'maintenance-pdfs');

create policy "storage_public_update" on storage.objects
for update to anon
using (bucket_id = 'maintenance-pdfs')
with check (bucket_id = 'maintenance-pdfs');

create policy "storage_public_delete" on storage.objects
for delete to anon
using (bucket_id = 'maintenance-pdfs');
