create table public.warranty_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  store text not null default '' check (char_length(store) <= 100),
  model text not null default '' check (char_length(model) <= 100),
  purchase_date date not null,
  warranty_months integer not null check (warranty_months between 0 and 600),
  expiry_date date not null,
  notes text not null default '' check (char_length(notes) <= 500),
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warranty_products_expiry_after_purchase check (expiry_date >= purchase_date),
  constraint warranty_products_receipt_in_user_folder check (
    receipt_path is null or receipt_path like user_id::text || '/%'
  )
);

create index warranty_products_user_expiry_idx
  on public.warranty_products (user_id, expiry_date);

alter table public.warranty_products enable row level security;

grant select, insert, update, delete on public.warranty_products to authenticated;

create policy warranty_products_select_own
  on public.warranty_products for select to authenticated
  using ((select auth.uid()) = user_id);

create policy warranty_products_insert_own
  on public.warranty_products for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy warranty_products_update_own
  on public.warranty_products for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy warranty_products_delete_own
  on public.warranty_products for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'warranty-receipts',
  'warranty-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf']
);

create policy warranty_receipts_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'warranty-receipts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy warranty_receipts_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'warranty-receipts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy warranty_receipts_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'warranty-receipts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'warranty-receipts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy warranty_receipts_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'warranty-receipts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
