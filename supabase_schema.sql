-- =========================
-- RECEIPTS (notas)
-- =========================
create table public.receipts (
  id text primary key,
  establishment text,
  date timestamp,
  user_id uuid references auth.users(id) default auth.uid() not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_receipts_user_date on public.receipts (user_id, date desc);
create index idx_receipts_user_created_at on public.receipts (user_id, created_at desc);

alter table public.receipts enable row level security;

create policy "Usuário vê as próprias notas" 
on public.receipts for select 
using (auth.uid() = user_id);

create policy "Usuário insere as próprias notas" 
on public.receipts for insert 
with check (auth.uid() = user_id);

create policy "Usuário atualiza as próprias notas" 
on public.receipts for update 
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuário deleta as próprias notas" 
on public.receipts for delete 
using (auth.uid() = user_id);

-- =========================
-- ITEMS (itens da nota)
-- =========================
create table public.items (
  id uuid primary key default gen_random_uuid(),
  receipt_id text references receipts(id) on delete cascade,

  name text, -- nome original SEFAZ

  normalized_key text,
  normalized_name text,
  category text,

  quantity numeric,
  unit text,
  price numeric,

  created_at timestamp with time zone default now()
);

create index idx_items_receipt_id on public.items (receipt_id);
create index idx_items_normalized_key on public.items (normalized_key);
create index idx_items_category on public.items (category);
create index idx_items_receipt_normalized on public.items (receipt_id, normalized_key);

alter table public.items enable row level security;

create policy "Usuário acessa seus itens"
on public.items
for all
using (
  exists (
    select 1 from receipts
    where receipts.id = items.receipt_id
    and receipts.user_id = auth.uid()
  )
);

-- =========================
-- DICIONÁRIO
-- =========================
create table public.product_dictionary (
  user_id uuid references auth.users(id) default auth.uid() not null,
  key text not null,
  normalized_name text,
  category text,
  created_at timestamp with time zone default now(),
  primary key (user_id, key)
);

alter table public.product_dictionary enable row level security;

create policy "Usuário vê seu dicionário"
on public.product_dictionary for select
using (auth.uid() = user_id);

create policy "Usuário insere seu dicionário"
on public.product_dictionary for insert
with check (auth.uid() = user_id);

create policy "Usuário atualiza seu dicionário"
on public.product_dictionary for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Usuário remove seu dicionário"
on public.product_dictionary for delete
using (auth.uid() = user_id);

create index idx_product_dictionary_user_key on public.product_dictionary (user_id, key);
create index idx_product_dictionary_user_category on public.product_dictionary (user_id, category);
