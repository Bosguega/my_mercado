-- High Priority Migration (2026-03-23)
-- 1) Isola product_dictionary por usuário (multi-tenant + RLS)
-- 2) Adiciona índices para consultas de histórico e itens
--
-- Atenção:
-- Esta migração recria a tabela product_dictionary para remover o modo global antigo.
-- O conteúdo atual do dicionário será perdido (cache reaprendido automaticamente).

begin;

-- =========================
-- PERFORMANCE INDEXES
-- =========================
create index if not exists idx_receipts_user_date on public.receipts (user_id, date desc);
create index if not exists idx_receipts_user_created_at on public.receipts (user_id, created_at desc);

create index if not exists idx_items_receipt_id on public.items (receipt_id);
create index if not exists idx_items_normalized_key on public.items (normalized_key);
create index if not exists idx_items_category on public.items (category);
create index if not exists idx_items_receipt_normalized on public.items (receipt_id, normalized_key);

-- =========================
-- DICTIONARY REBUILD (SECURITY)
-- =========================
drop policy if exists "Usuário acessa dicionário" on public.product_dictionary;
drop policy if exists "Usuário vê seu dicionário" on public.product_dictionary;
drop policy if exists "Usuário insere seu dicionário" on public.product_dictionary;
drop policy if exists "Usuário atualiza seu dicionário" on public.product_dictionary;
drop policy if exists "Usuário remove seu dicionário" on public.product_dictionary;

drop table if exists public.product_dictionary;

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

commit;
