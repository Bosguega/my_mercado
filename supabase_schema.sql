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
  key text primary key,
  normalized_name text,
  category text,
  created_at timestamp default now()
);

alter table public.product_dictionary enable row level security;

create policy "Usuário acessa dicionário"
on public.product_dictionary
for all
using (true);